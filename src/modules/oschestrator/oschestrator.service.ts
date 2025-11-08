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
                .orderBy('batch.batch_priority', 'ASC')
                .addOrderBy('batch.created_at', 'ASC')
                .getMany();

            if (!pendingBatchJobs.length) {
                this.logger.log('No pending batch jobs found.');
                return;
            }

            this.logger.log(
                `Pending batch jobs in priority order: ${pendingBatchJobs
                    .map(b => `${b.batch_job_id}(prio:${b.batch_priority})`)
                    .join(', ')}`
            );

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

                    // Commit the batch job status update
                    await batchQueryRunner.commitTransaction();

                    // Build dependency-aware chains from acknowledged tasks
                    const chains = await this.buildChainsForBatch(tasks);

                    // For each chain, try to assign a robot and start sequential processing
                    for (const chain of chains) {
                        let chainQueryRunner: QueryRunner | null = null;
                        try {
                            if (!chain.length) continue;

                            const rootTask = chain[0];
                            chainQueryRunner = this.batchJobRepository.manager.connection.createQueryRunner();
                            await chainQueryRunner.connect();
                            await chainQueryRunner.startTransaction();

                            let assignedRobotId: string | null = rootTask.robot_id ?? null;

                            // Case 1: Root has no dependency -> assign a fresh available robot of matching task type
                            if (!rootTask.task_dependency) {
                                const availableRobots = await chainQueryRunner.query(
                                    `SELECT robot_id FROM robots WHERE available = true and is_active = true and task_type = $1 LIMIT 1 FOR UPDATE`,
                                    [rootTask.task_type]
                                );
                                if (availableRobots && availableRobots.length > 0) {
                                    assignedRobotId = availableRobots[0].robot_id;
                                    // Reserve robot
                                    await chainQueryRunner.query(
                                        `UPDATE robots SET available = false WHERE robot_id = $1`,
                                        [assignedRobotId]
                                    );
                                }
                            } else {
                                // Case 2: Root depends on a completed task -> reserve same robot as parent if available
                                const parentTask = await chainQueryRunner.manager.findOne(Task, { where: { task_id: rootTask.task_dependency } });
                                if (!parentTask || parentTask.status !== 'completed' || !parentTask.robot_id) {
                                    // Can't start this chain yet
                                    await chainQueryRunner.rollbackTransaction();
                                    continue;
                                }
                                // Check and reserve the same robot
                                const parentRobot = await chainQueryRunner.manager.findOne(Robot, { where: { robot_id: parentTask.robot_id } });
                                if (!parentRobot || !parentRobot.is_active || !parentRobot.available) {
                                    // Robot not available yet
                                    await chainQueryRunner.rollbackTransaction();
                                    continue;
                                }
                                assignedRobotId = parentTask.robot_id;
                                await chainQueryRunner.manager.update(Robot, { robot_id: assignedRobotId }, { available: false });
                            }

                            if (!assignedRobotId) {
                                this.logger.warn(`No robot available for chain starting with task ${rootTask.task_id}. Will retry in next cycle.`);
                                await chainQueryRunner.rollbackTransaction();
                                continue;
                            }

                            // Assign the robot to all tasks in this chain and mark only the first as processing (reservation)
                            for (let i = 0; i < chain.length; i++) {
                                const t = chain[i];
                                await chainQueryRunner.query(
                                    `UPDATE tasks SET robot_id = $1${i === 0 ? ', status = \'processing\'' : ''} WHERE task_id = $2`,
                                    [assignedRobotId, t.task_id]
                                );
                                t.robot_id = assignedRobotId;
                                if (i === 0) t.status = 'processing';
                            }

                            await chainQueryRunner.commitTransaction();

                            // Start sequential processing for the chain (will handle webhooks and completion updates)
                            this.processTaskQueueInterval(chain).catch(error => {
                                this.logger.error('Error in background chain processing:', error);
                            });

                        } catch (chainErr) {
                            this.logger.error('Error assigning/starting chain:', chainErr);
                            if (chainQueryRunner?.isTransactionActive) {
                                try { await chainQueryRunner.rollbackTransaction(); } catch {}
                            }
                        } finally {
                            if (chainQueryRunner) {
                                try { await chainQueryRunner.release(); } catch {}
                            }
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

            // Keep robot reserved for the entire chain
            const chainRobotId = tasksToProcess[0]?.robot_id;
            let robotReleasedInLoop = false;

            for (const task of tasksToProcess) {
                if (!task.robot_id) { continue; }

                // Always re-fetch latest batch status and task status before starting this step
                const latestBatch = await this.batchJobRepository.findOne({ where: { batch_job_id: existingBatchJob.batch_job_id } });
                if (latestBatch?.status === 'cancelled') {
                    this.logger.warn(`Batch ${latestBatch.batch_job_id} was cancelled. Halting chain.`);
                    if (chainRobotId) {
                        await this.robotRepository.update({ robot_id: chainRobotId }, { available: true });
                        robotReleasedInLoop = true;
                    }
                    break;
                }

                const latestTask = await this.taskRepository.findOne({ where: { task_id: task.task_id } });
                if (latestTask?.status === 'cancelled') {
                    this.logger.warn(`Task ${task.task_id} is cancelled before start. Halting chain.`);
                    if (chainRobotId) {
                        await this.robotRepository.update({ robot_id: chainRobotId }, { available: true });
                        robotReleasedInLoop = true;
                    }
                    await this.wms_webhook({ tasks: [latestTask], existingBatchJob: existingBatchJob });
                    break;
                }

                task.status = 'processing';
                await this.taskRepository.save(task);
                await this.wms_webhook({ tasks: [task], existingBatchJob: existingBatchJob });

                // Simulate task processing time of 60 seconds
                await new Promise(resolve => setTimeout(resolve, 10000));

                // check if this task was cancelled
                const checkTaskForCancel = await this.taskRepository.findOne({
                    where: { task_id: task.task_id, status: 'cancelled' }
                });

                if (checkTaskForCancel) {
                    this.logger.warn(`Task ${task.task_id} was cancelled. Skipping.`);
                    // Release robot immediately for next tasks and stop the chain
                    if (chainRobotId) {
                        await this.robotRepository.update(
                            { robot_id: chainRobotId },
                            { available: true }
                        );
                        robotReleasedInLoop = true;
                    }
                    // Notify cancellation status upstream
                    await this.wms_webhook({ tasks: [checkTaskForCancel], existingBatchJob: existingBatchJob });
                    break;
                }

                task.status = 'completed';
                await this.taskRepository.save(task);
                // Do not release robot here; release after the entire chain completes

                await this.wms_webhook({ tasks: [task], existingBatchJob: existingBatchJob });
            }
            // After chain completion, release robot (if not already released due to cancellation)
            if (chainRobotId && !robotReleasedInLoop) {
                await this.robotRepository.update(
                    { robot_id: chainRobotId },
                    { available: true }
                );
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
     * Build dependency-aware chains from a list of acknowledged tasks in a batch.
     * Chains are ordered from the root task (no dependency or parent completed) to successive dependents.
     */
    private async buildChainsForBatch(ackTasks: Task[]): Promise<Task[][]> {
        const chains: Task[][] = [];
        const byId = new Map<string, Task>();
        const visited = new Set<string>();
        ackTasks.forEach(t => byId.set(t.task_id, t));

        // Helper to find the next dependent task within acknowledged set
        const findChild = (parentId: string): Task | undefined => {
            return ackTasks.find(t => t.task_dependency === parentId && !visited.has(t.task_id));
        };

        for (const task of ackTasks) {
            if (visited.has(task.task_id)) continue;

            // Determine if this task can be a chain root right now
            let canStart = false;
            if (!task.task_dependency) {
                canStart = true; // No dependency
            } else if (!byId.has(task.task_dependency)) {
                // Depends on a task not in ack set; check DB if parent is completed -> then can start
                try {
                    const parent = await this.taskRepository.findOne({ where: { task_id: task.task_dependency } });
                    if (parent && parent.status === 'completed' && parent.robot_id) {
                        canStart = true;
                    }
                } catch {}
            } else {
                // Depends on another ack task -> will be covered when its parent becomes root, so skip here
                canStart = false;
            }

            if (!canStart) continue;

            const chain: Task[] = [];
            let current: Task | undefined = task;
            while (current) {
                chain.push(current);
                visited.add(current.task_id);
                const next = findChild(current.task_id);
                if (!next) break;
                current = next;
            }
            if (chain.length) chains.push(chain);
        }
        return chains;
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
                    task_type: (i%2)==0 ? TaskType.CrossDock_Internal: TaskType.Baseops
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
