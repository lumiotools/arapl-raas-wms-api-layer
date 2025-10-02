import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch, QueryRunner, Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from '../robot-job/entities/batch_task.entity';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { Robot } from '../robot-job/entities/robot.entity';
import { LocationAction, TaskGenerationReq, TaskType } from '../robot-job/dto/Task_Generation.dto';
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

    // @Cron('*/10 * * * * *')
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

                    // Update batch status to processing first
                    // await batchQueryRunner.manager.update(BatchJob, 
                    //     { batch_job_id: pendingBatchJob.batch_job_id }, 
                    //     { status: 'processing' }
                    // );

                    // Commit the batch job status update
                    await batchQueryRunner.commitTransaction();

                    // Process each task individually with separate transactions
                    const processedTasks: Task[] = [];
                    
                    for (const task of tasks) {
                        let taskQueryRunner: QueryRunner | null = null;
                        
                        try {
                            console.log(`Processing task: ${JSON.stringify(task)}`);
                            
                            // Create new transaction for each task
                            taskQueryRunner = this.batchJobRepository.manager.connection.createQueryRunner();
                            await taskQueryRunner.connect();
                            await taskQueryRunner.startTransaction();
                            
                            let assignedRobotId = task.robot_id;
                            
                            // Robot assignment logic
                            // if (!assignedRobotId) {
                            //     const availableRobot = await taskQueryRunner.manager.findOne(Robot, {
                            //         where: { available: true }
                            //     });
                            //     if (availableRobot) {
                            //         task.robot_id = availableRobot.robot_id;
                            //         assignedRobotId = availableRobot.robot_id;
                            //         await taskQueryRunner.manager.save(task);
                            //         await taskQueryRunner.manager.update(Robot, 
                            //             { robot_id: availableRobot.robot_id }, 
                            //             { available: false }
                            //         );
                            //         this.logger.log(`Assigned robot ${availableRobot.robot_id} to task ${task.task_id}`);
                            //     }
                            // }

                            // Robot assignment logic using raw queries
                            if (!assignedRobotId) {
                                // Find available robot with row lock (prevents race conditions)
                                const availableRobots = await taskQueryRunner.query(
                                    `SELECT robot_id FROM robots WHERE available = true and is_active = true and task_type = $1 LIMIT 1 FOR UPDATE`,
                                    [task.task_type]
                                );
                                
                                if (availableRobots && availableRobots.length > 0) {
                                    const availableRobotId = availableRobots[0].robot_id;
                                    
                                    // Update task with robot_id
                                    await taskQueryRunner.query(
                                        `UPDATE tasks SET robot_id = $1 WHERE task_id = $2`,
                                        [availableRobotId, task.task_id]
                                    );
                                    
                                    // Update robot availability
                                    await taskQueryRunner.query(
                                        `UPDATE robots SET available = false WHERE robot_id = $1`,
                                        [availableRobotId]
                                    );
                                    
                                    // Update local task object
                                    task.robot_id = availableRobotId;
                                    assignedRobotId = availableRobotId;
                                    
                                    this.logger.log(`Assigned robot ${availableRobotId} to task ${task.task_id}`);
                                }
                            }
                            
                            if (!assignedRobotId) {
                                this.logger.warn(`No robot available for task ${task.task_id}. Will retry in next cycle.`);
                                await taskQueryRunner.rollbackTransaction();
                                continue; // Skip to next task, not batch job
                            }

                            // Update robot status if not already updated
                            if (task.robot_id !== assignedRobotId) {
                                await taskQueryRunner.manager.update(Robot,
                                    { robot_id: assignedRobotId },
                                    { available: false }
                                );
                            }

                            // Update task status
                            task.status = 'processing';
                            await taskQueryRunner.manager.save(task);
                            
                            // Commit the task transaction
                            await taskQueryRunner.commitTransaction();
                            
                            // Add to processed tasks list
                            processedTasks.push(task);
                            
                        } catch (taskError) {
                            this.logger.error(`Error processing task ${task.task_id}:`, taskError);
                            
                            // Rollback task transaction if active
                            if (taskQueryRunner?.isTransactionActive) {
                                try {
                                    await taskQueryRunner.rollbackTransaction();
                                } catch (rollbackError) {
                                    this.logger.error('Error rolling back task transaction:', rollbackError);
                                }
                            }
                            
                            // Continue with next task
                            continue;
                            
                        } finally {
                            // Clean up the task-specific query runner
                            if (taskQueryRunner) {
                                try {
                                    await taskQueryRunner.release();
                                } catch (releaseError) {
                                    this.logger.error('Error releasing task query runner:', releaseError);
                                }
                            }
                        }
                    }

                    // Process all successfully updated tasks outside transactions
                    if (processedTasks.length > 0) {
                        try {
                            await this.wms_webhook({tasks: processedTasks, existingBatchJob: pendingBatchJob});
                            
                            // Don't await this - let it run in background
                            processedTasks.forEach(task => {
                                this.processTaskQueueInterval([task]).catch(error => {
                                    this.logger.error('Error in background task processing:', error);
                                });
                            });
                        } catch (webhookError) {
                            this.logger.error('Error in webhook call:', webhookError);
                            // Note: Database changes are already committed
                            // You might want to implement compensating actions here
                        }
                    }
                    
                } catch (batchError) {
                    this.logger.error(`Error processing batch job ${pendingBatchJob.batch_job_id}:`, batchError);
                    
                    // Rollback batch transaction if it exists and is active
                    if (batchQueryRunner?.isTransactionActive) {
                        try {
                            await batchQueryRunner.rollbackTransaction();
                        } catch (rollbackError) {
                            this.logger.error('Error rolling back batch transaction:', rollbackError);
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
                if (task.end_location.location_action === LocationAction.DROP){
                    await this.robotRepository.update(
                        { robot_id: task.robot_id },
                        { available: true }
                    );
                }

                // Robot remains assigned and unavailable until freed via external endpoint
                // The robot will only be freed through the setRobotAvailable endpoint

                await this.wms_webhook({ tasks: [task], existingBatchJob: existingBatchJob });
            }
            const pendingTasksOfBatch = await this.taskRepository.find({
                where: { batch_job: { batch_job_id: existingBatchJob.batch_job_id }, status: 'pending' },
            });
            if (pendingTasksOfBatch.length === 0) {
                existingBatchJob.status = 'completed';
                await this.batchJobRepository.save(existingBatchJob);
            }

            
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
            // const robotIds = [
            //     'ROBOT-001',
            //     'ROBOT-002',
            //     'ROBOT-003',
            //     'ROBOT-004',
            //     'ROBOT-005',
            //     // '6ba7b812-9dad-11d1-80b4-00c04fd430c9',
            //     // '6ba7b813-9dad-11d1-80b4-00c04fd430c9'
            // ];
            
            // for (const robotId of robotIds) {
            //     const existingRobot = await this.robotRepository.findOne({
            //         where: { robot_id: robotId }
            //     });
                
            //     if (!existingRobot) {
            //         const robot = this.robotRepository.create({
            //             robot_id: robotId,
            //             available: true
            //         });
            //         await this.robotRepository.save(robot);
            //         this.logger.log(`Initialized robot ${robotId} in database`);
            //     }
            // }
            this.createRobots(10);
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
            if (highestRobot?.robot_id === 'ROBOT-010') {
                return {
                    message: 'Maximum robot limit reached (ROBOT-010). Cannot create more robots.',
                    success: false,
                    robots: []
                }
            }

            let startIndex = 1;
            if (highestRobot && /^ROBOT-\d+$/.test(highestRobot.robot_id)) {
                // Extract the numeric part and increment
                const lastNum = parseInt(highestRobot.robot_id.replace('ROBOT-', ''), 10);
                startIndex = lastNum + 1;
            }

            const robots: string[] = [];
            for (let i = 0; i < count; i++) {
                const robotId = `ROBOT-${String(startIndex + i).padStart(3, '0')}`;
                console.log(`Creating robot with ID: ${robotId}, index: ${i}`);
                const robot = this.robotRepository.create({
                    robot_id: robotId,
                    available: true,
                    task_type: (i%2)==0 ? TaskType.GoodsToPerson: TaskType.BASEOPS
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
