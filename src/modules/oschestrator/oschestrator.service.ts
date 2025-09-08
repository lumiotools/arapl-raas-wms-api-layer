import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch, QueryRunner, Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from '../robot-job/entities/batch_task.entity';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { Robot } from '../robot-job/entities/robot.entity';
import { TaskGenerationReq } from '../robot-job/dto/Task_Generation.dto';
import { queueElementDto } from './dto/queue.dto';
import axios from 'axios';
import { promises } from 'dns';
import { queue } from 'rxjs';

@Injectable()
export class OschestratorService {
    private readonly logger = new Logger(OschestratorService.name);

    private TaskQueue: Task[] = []
    private isCheckBatchJobStatus = false;
    
    // Track task-robot assignments (keep this in memory for performance)
    private taskRobotAssignments = new Map<string, string>(); // taskId -> robotId

    constructor (
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(BatchJob)
        private readonly batchJobRepository: Repository<BatchJob>,

        @InjectRepository(Warehouse)
        private readonly warehouseRepository: Repository<Warehouse>,

        @InjectRepository(Robot)
        private readonly robotRepository: Repository<Robot>,
    ) { 
        this.initializeRobots();
    }

   @Interval(2000)
    async checkBatchTaskStatus(): Promise<void> {
        if (this.isCheckBatchJobStatus) {
            this.logger.warn('Already checking batch job status, skipping this cycle');
            return;
        }
        
        // Set flag immediately
        this.isCheckBatchJobStatus = true;
        
        let queryRunner: QueryRunner | null = null;
        
        try {
            // First, get all pending batch jobs without transaction
            queryRunner = this.batchJobRepository.manager.connection.createQueryRunner();
            await queryRunner.connect();
            
            const pendingBatchJobs = await queryRunner.manager
                .createQueryBuilder(BatchJob, 'batch')
                .where('batch.status = :status', { status: 'pending' })
                .getMany();

            if (!pendingBatchJobs.length) {
                this.logger.log('No pending batch jobs found.');
                return;
            }

            // Process each batch job with its own transaction
            for (const pendingBatchJob of pendingBatchJobs) {
                let batchQueryRunner: QueryRunner | null = null;
                
                try {
                    // Create a new query runner for each batch job
                    batchQueryRunner = this.batchJobRepository.manager.connection.createQueryRunner();
                    await batchQueryRunner.connect();
                    await batchQueryRunner.startTransaction();
                    
                    // Re-check and lock the specific batch job
                    const lockedBatchJob = await batchQueryRunner.manager
                        .createQueryBuilder(BatchJob, 'batch')
                        .where('batch.batch_job_id = :id AND batch.status = :status', { 
                            id: pendingBatchJob.batch_job_id, 
                            status: 'pending' 
                        })
                        .setLock('pessimistic_write')
                        .getOne();

                    if (!lockedBatchJob) {
                        this.logger.log(`Batch job ${pendingBatchJob.batch_job_id} is no longer pending, skipping`);
                        await batchQueryRunner.commitTransaction();
                        continue;
                    }
                    
                    const tasks = await batchQueryRunner.manager.find(Task, {
                        where: { batch_job: { batch_job_id: pendingBatchJob.batch_job_id }, status: 'pending' },
                    });

                    if (!tasks.length) {
                        this.logger.log(`No pending tasks found for batch job ${pendingBatchJob.batch_job_id}`);
                        await batchQueryRunner.commitTransaction();
                        continue;
                    }

                    const task = tasks[0];
                    console.log(`Processing task: ${JSON.stringify(task)}`);
                    
                    let assignedRobotId = task.robot_id;
                    
                    // Robot assignment logic
                    if (!assignedRobotId) {
                        const availableRobot = await batchQueryRunner.manager.findOne(Robot, {
                            where: { available: true }
                        });
                        if (availableRobot) {
                            task.robot_id = availableRobot.robot_id;
                            assignedRobotId = availableRobot.robot_id;
                            await batchQueryRunner.manager.save(task);
                            await this.robotRepository.update(availableRobot.robot_id, { available: false, current_task_id: task.task_id });
                            this.logger.log(`Assigned robot ${availableRobot.robot_id} to task ${task.task_id}`);
                        }
                    }
                    
                    if (!assignedRobotId) {
                        this.logger.warn(`No robot available for task ${task.task_id}. Will retry in next cycle.`);
                        await batchQueryRunner.commitTransaction();
                        continue; // Skip to next batch job
                    }

                    // Update robot status
                    await batchQueryRunner.manager.update(Robot,
                        { robot_id: assignedRobotId },
                        { available: false, current_task_id: task.task_id }
                    );

                    // Update task status
                    task.status = 'processing';
                    await batchQueryRunner.manager.save(task);
                    
                    // Update batch status
                    await batchQueryRunner.manager.update(BatchJob, 
                        { batch_job_id: pendingBatchJob.batch_job_id }, 
                        { status: 'processing' }
                    );
                    
                    // Commit the transaction before external operations
                    await batchQueryRunner.commitTransaction();
                    
                    // Process the task outside the transaction
                    this.TaskQueue.push(task);
                    
                    // Handle webhook and task processing (outside transaction)
                    try {
                        await this.wms_webhook({tasks: tasks, existingBatchJob: pendingBatchJob});
                        const tasksToProcess: Task[] = [...this.TaskQueue];
                        this.TaskQueue.length = 0;
                        
                        // Don't await this - let it run in background
                        this.processTaskQueueInterval(tasksToProcess).catch(error => {
                            this.logger.error('Error in background task processing:', error);
                        });
                    } catch (webhookError) {
                        this.logger.error('Error in webhook call:', webhookError);
                        // Note: Transaction is already committed, so we can't rollback
                        // You might want to implement compensating actions here
                    }
                    
                } catch (batchError) {
                    this.logger.error(`Error processing batch job ${pendingBatchJob.batch_job_id}:`, batchError);
                    
                    // Rollback transaction if it exists and is active
                    if (batchQueryRunner?.isTransactionActive) {
                        try {
                            await batchQueryRunner.rollbackTransaction();
                        } catch (rollbackError) {
                            this.logger.error('Error rolling back transaction:', rollbackError);
                        }
                    }
                    
                    // Continue with next batch job instead of stopping the entire process
                    continue;
                    
                } finally {
                    // Clean up the batch-specific query runner
                    if (batchQueryRunner) {
                        try {
                            await batchQueryRunner.release();
                        } catch (releaseError) {
                            this.logger.error('Error releasing batch query runner:', releaseError);
                        }
                    }
                }
            }
            
        } catch (error) {
            this.logger.error('Error checking batch job status:', error);
            
        } finally {
            // CRITICAL: Always clean up and reset flag
            if (queryRunner) {
                try {
                    await queryRunner.release();
                } catch (releaseError) {
                    this.logger.error('Error releasing query runner:', releaseError);
                }
            }
            
            // ALWAYS reset the flag - this prevents the infinite skip cycle
            this.isCheckBatchJobStatus = false;
            this.logger.debug('Batch job status check completed, flag reset');
        }
    }

    // @Interval(60000)
    async processTaskQueueInterval(tasksToProcess: Task[]): Promise<void> {
        try {
            const firstTask = tasksToProcess[0];
            const existingBatchJob = await this.batchJobRepository.findOne({
                where: { batch_job_id: firstTask.batch_job.batch_job_id },
            });
            if (!existingBatchJob) {
                this.logger.warn(`Batch job ${firstTask.batch_job.batch_job_id} does not exist or Cancelled. Skipping.`);
                return;
            }
            existingBatchJob.status = 'processing';
            await this.batchJobRepository.save(existingBatchJob);

            for (const task of tasksToProcess) {
                if (!task.robot_id) { continue; }
                task.status = 'processing';
                await this.taskRepository.save(task);
                await this.wms_webhook({ tasks: [task], existingBatchJob: existingBatchJob });

                // Simulate task processing time of 60 seconds
                await new Promise(resolve => setTimeout(resolve, 40000));

                // check if this task was cancelled
                const checkTaskForCancel = await this.taskRepository.findOne({
                    where: { task_id: task.task_id, status: 'cancelled' }
                });

                if (checkTaskForCancel) {
                    this.logger.warn(`Task ${task.task_id} was cancelled. Skipping.`);
                    continue;
                }

                task.status = 'completed';
                await this.taskRepository.save(task);
                if (task.end_location?.location_id?.startsWith('R')) {
                    await this.robotRepository.update(
                        { robot_id: task.robot_id },
                        { available: true, current_task_id: null }
                    );
                }

                // Robot remains assigned and unavailable until freed via external endpoint
                // The robot will only be freed through the setRobotAvailable endpoint

                await this.wms_webhook({ tasks: [task], existingBatchJob: existingBatchJob });
            }

            existingBatchJob.status = 'completed';

            await this.batchJobRepository.save(existingBatchJob);

            // await this.wms_webhook({ tasks: tasksToProcess, existingBatchJob: existingBatchJob });

        } catch (error) {
            this.logger.error('Error in task processor:', error);
        }
    }

    async makeRobotAvailable(robot_id:string){
        await this.robotRepository.update({ robot_id }, { available: true });
    }

    async webhook_payload(queueElement: { tasks: Task[], existingBatchJob: BatchJob }): Promise<any> {
        const batchJob = queueElement.existingBatchJob;
        const tasks = queueElement.tasks;

        const defaultPagination = {
            "batch_job_id": batchJob.batch_job_id,
            "batch_job_status": batchJob.status,
            "tasks":[
                {
                    "task_id": tasks[0].task_id,
                    "status": tasks[0].status,
                    "robot_id": tasks[0].robot_id
                }
            ]
        }
        return defaultPagination;
    }
    async wms_webhook(queueElement: {
        tasks: Task[];
        existingBatchJob: BatchJob;
    }): Promise<any> {
        try {
            const payload = await this.webhook_payload(queueElement);
            const warehouseId = queueElement.existingBatchJob.warehouse_id;

            // Get the warehouse to find its webhook URL
            const warehouse = await this.warehouseRepository.findOne({
                where: { warehouse_id: warehouseId },
            });

            if (!warehouse) {
                this.logger.warn(
                    `Warehouse with ID '${warehouseId}' not found. Skipping webhook.`,
                );
                return {};
            }

            // Use warehouse's webhook URL if available, otherwise skip
            if (!warehouse.webhook_url) {
                this.logger.warn(
                    `No webhook URL configured for warehouse '${warehouseId}'. Skipping webhook.`,
                );
                return {};
            }

            const response = await axios.post(warehouse.webhook_url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            return response;
        }
        catch (error) {
            this.logger.error('Error in WMS webhook:', error);
            return {};
        }
        
    } 

    getTaskRobotAssignments(): { taskId: string; robotId: string }[] {
        return Array.from(this.taskRobotAssignments.entries()).map(([taskId, robotId]) => ({
            taskId,
            robotId
        }));
    }

    /**
     * Initialize robots in database if they don't exist
     */
    private async initializeRobots(): Promise<void> {
        try {
            const robotIds = [
                'ROBOT-001',
                'ROBOT-002',
                'ROBOT-003',
                'ROBOT-004',
                'ROBOT-005',
                // '6ba7b812-9dad-11d1-80b4-00c04fd430c9',
                // '6ba7b813-9dad-11d1-80b4-00c04fd430c9'
            ];
            
            for (const robotId of robotIds) {
                const existingRobot = await this.robotRepository.findOne({
                    where: { robot_id: robotId }
                });
                
                if (!existingRobot) {
                    const robot = this.robotRepository.create({
                        robot_id: robotId,
                        available: true
                    });
                    await this.robotRepository.save(robot);
                    this.logger.log(`Initialized robot ${robotId} in database`);
                }
            }
        } catch (error) {
            this.logger.error('Error initializing robots:', error);
        }
    }

    /**
     * Delete all robots and create new ones with sequential IDs
     */
    async createRobots(count: number): Promise<{ message: string; success: boolean; robots: string[] }> {
        try {
            // await this.batchJobRepository.query('TRUNCATE TABLE batch_tasks CASCADE');
            // await this.robotRepository.clear();
            // Find the highest existing robot ID (e.g., ROBOT-009)
            const highestRobot = await this.robotRepository
                .createQueryBuilder('robot')
                .orderBy('robot.robot_id', 'DESC')
                .getOne();

            let startIndex = 1;
            if (highestRobot && /^ROBOT-\d+$/.test(highestRobot.robot_id)) {
                // Extract the numeric part and increment
                const lastNum = parseInt(highestRobot.robot_id.replace('ROBOT-', ''), 10);
                startIndex = lastNum + 1;
            }

            const robots: string[] = [];
            for (let i = 0; i < count; i++) {
                const robotId = `ROBOT-${String(startIndex + i).padStart(3, '0')}`;
                const robot = this.robotRepository.create({
                    robot_id: robotId,
                    available: true,
                    last_task_id: null,
                    current_task_id: null
                });
                await this.robotRepository.save(robot);
                robots.push(robotId);
            }
            this.logger.log(`Created ${count} robots: ${robots.join(', ')}`);
            return {
                message: `Created ${count} robots`,
                success: true,
                robots
            };
        } catch (error) {
            this.logger.error('Error creating robots:', error);
            return {
                message: 'Error creating robots',
                success: false,
                robots: []
            };
        }
    }

    /**
     * Get a robot that didn't end at inventory but can be assigned to a task that depends on its last task
     */
    private async getRobotWaitingForDependentTask(taskId: string): Promise<string | null> {
        try {
            const availableRobots = await this.robotRepository.find({
                where: { available: true }
            });
            
            // Check each available robot to see if this task depends on its last task
            for (const robot of availableRobots) {
                const lastTaskId = await this.getLastTaskForRobot(robot.robot_id);
                
                if (lastTaskId) {
                    // Check if the current task depends on this robot's last task
                    // We need to find if there's a dependency chain that connects this task to the robot's last task
                    const isDependentOnLastTask = await this.isTaskDependentOnTask(taskId, lastTaskId);
                    
                    if (isDependentOnLastTask) {
                        // Check if the robot's last task did NOT end at inventory
                        const lastTaskEntity = await this.taskRepository.findOne({
                            where: { task_id: lastTaskId }
                        });
                        
                        if (lastTaskEntity) {
                            const endLocation = lastTaskEntity.end_location;
                            const endedAtInventory = endLocation?.location_attribute?.attribute_value === 'inventory';
                            
                            if (!endedAtInventory) {
                                this.logger.log(`Robot ${robot.robot_id} last task ${lastTaskId} did not end at inventory and current task ${taskId} depends on it - can assign`);
                                return robot.robot_id;
                            }
                        }
                    }
                }
            }
            
            return null;
        } catch (error) {
            this.logger.error('Error getting robot waiting for dependent task:', error);
            return null;
        }
    }
    
    /**
     * Get the last completed task ID for a robot (from DB)
     */
    private async getLastTaskForRobot(robotId: string): Promise<string | null> {
        try {
            const robot = await this.robotRepository.findOne({ where: { robot_id: robotId } });
            return robot?.last_task_id || null;
        } catch (error) {
            this.logger.error(`Error getting last task for robot ${robotId}:`, error);
            return null;
        }
    }

    /**
     * Check if a task is dependent on another task (directly or through dependency chain)
     */
    private async isTaskDependentOnTask(taskId: string, dependencyTaskId: string): Promise<boolean> {
        try {
            const task = await this.taskRepository.findOne({ where: { task_id: taskId } });
            if (task?.task_dependency === dependencyTaskId) {
                return true;
            }
            // Could implement recursive dependency checking here if needed
            return false;
        } catch (error) {
            this.logger.error(`Error checking if task ${taskId} depends on ${dependencyTaskId}:`, error);
            return false;
        }
    }

    /**
     * Get all robots in the system
     */
    async getAllRobots(): Promise<any[]> {
        try {
            const robots = await this.robotRepository.find();
            return robots;
        } catch (error) {
            this.logger.error('Error getting all robots:', error);
            return [];
        }
    }
}
