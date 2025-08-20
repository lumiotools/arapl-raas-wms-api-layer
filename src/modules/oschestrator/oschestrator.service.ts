import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch, Repository } from 'typeorm';
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

    private async assignRobotToTask(task: Task): Promise<string | null> {
        let assignedRobotId: string | null = null;
        try {
            // 1. If task has dependency, assign only the robot that was last assigned to the dependency task (if available)
            if (task.task_dependency) {
                
                let robot = await this.robotRepository.findOne({
                    where: { last_task_id: task.task_dependency }
                })
                if (task.start_location?.location_attribute?.attribute_value === 'waiting_location') {
                    robot = await this.robotRepository.findOne({
                        where:{current_task_id: task.task_dependency}
                    });
                }
                const dependencyRobotId = robot?.robot_id;
                this.logger.log(`Task ${task.task_id} has dependency ${task.task_dependency}, dependency robot: ${dependencyRobotId}`);
                if (dependencyRobotId) {
                    const dependencyRobot = await this.robotRepository.findOne({ where: { robot_id: dependencyRobotId } });
                    if (dependencyRobot?.available  || task.start_location?.location_attribute?.attribute_value === 'waiting_location') {
                        assignedRobotId = dependencyRobotId;
                        this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (dependency logic)`);
                    } else {
                        this.logger.warn(`Dependency robot ${dependencyRobotId} is not available for task ${task.task_id}. Task will wait.`);
                        return null;
                    }
                } else {
                    this.logger.warn(`Dependency task ${task.task_dependency} has no robot assignment. Cannot assign robot to task ${task.task_id}`);
                    return null;
                }
            } else {
                // 2. If no dependency, assign any available robot whose last task ended at inventory or is null
                const availableRobots = await this.robotRepository.find({ where: { available: true } });
                for (const robot of availableRobots) {
                    console.log(`robot: ${JSON.stringify(robot)}`);
                    if (!robot.last_task_id) {
                        // 3. If last_task_id is null, robot is free to be given to any task
                        assignedRobotId = robot.robot_id;
                        this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (no dependency, robot never assigned before)`);
                        break;
                    } else {
                        // Check if last task ended at inventory
                        const lastTask = await this.taskRepository.findOne({ where: { task_id: robot.last_task_id } });
                        const endedAtInventory = lastTask?.end_location?.location_attribute?.attribute_value == 'inventory';

                        console.log(`Robot ${robot.robot_id} last task ${robot.last_task_id} ended at inventory: ${endedAtInventory}`);
                        if (endedAtInventory) {
                            assignedRobotId = robot.robot_id;
                            this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (no dependency, last task ended at inventory)`);
                            break;
                        }
                    }
                }
                if (!assignedRobotId) {
                    this.logger.warn(`No available robots for task ${task.task_id} (no dependency) - none meet assignment criteria`);
                    return null;
                }
            }
            if (assignedRobotId) {
                await this.robotRepository.update(
                    { robot_id: assignedRobotId },
                    { available: false, current_task_id: task.task_id }
                );
                this.taskRobotAssignments.set(task.task_id, assignedRobotId);
                this.logger.log(`Successfully assigned robot ${assignedRobotId} to task ${task.task_id}. Robot marked as unavailable in database.`);
                return assignedRobotId;
            }
            return null;
        } catch (error) {
            this.logger.error(`Error assigning robot to task ${task.task_id}:`, error);
            return null;
        }
    }

    private async assignRobotToTaskWithLock(task: Task, queryRunner: any): Promise<string | null> {
        try {
            // Lock available robots
            const availableRobots = await queryRunner.manager
                .createQueryBuilder(Robot, 'robot')
                .where('robot.available = :available', { available: true })
                .setLock('pessimistic_write')
                .getMany();

            let assignedRobotId: string | null = null;

            // 1. If task has dependency, assign only the robot that was last assigned to the dependency task (if available)
            if (task.task_dependency) {
                
                let robot = await this.robotRepository.findOne({
                    where: { last_task_id: task.task_dependency }
                })
                if (task.start_location?.location_attribute?.attribute_value === 'waiting_location') {
                    robot = await this.robotRepository.findOne({
                        where:{current_task_id: task.task_dependency}
                    });
                }
                const dependencyRobotId = robot?.robot_id;
                this.logger.log(`Task ${task.task_id} has dependency ${task.task_dependency}, dependency robot: ${dependencyRobotId}`);
                if (dependencyRobotId) {
                    const dependencyRobot = await this.robotRepository.findOne({ where: { robot_id: dependencyRobotId } });
                    if (dependencyRobot?.available  || task.start_location?.location_attribute?.attribute_value === 'waiting_location') {
                        assignedRobotId = dependencyRobotId;
                        this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (dependency logic)`);
                    } else {
                        this.logger.warn(`Dependency robot ${dependencyRobotId} is not available for task ${task.task_id}. Task will wait.`);
                        return null;
                    }
                } else {
                    this.logger.warn(`Dependency task ${task.task_dependency} has no robot assignment. Cannot assign robot to task ${task.task_id}`);
                    return null;
                }
            } else {
                // 2. If no dependency, assign any available robot whose last task ended at inventory or is null
                const availableRobots = await this.robotRepository.find({ 
                    where: { available: true },
                    order: { robot_id: 'ASC' } // Fetch robots in order of IDs (ROBOT-009, ROBOT-010, etc.)
                });
                for (const robot of availableRobots) {
                    console.log(`robot: ${JSON.stringify(robot)}`);
                    if (!robot.last_task_id) {
                        // 3. If last_task_id is null, robot is free to be given to any task
                        assignedRobotId = robot.robot_id;
                        this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (no dependency, robot never assigned before)`);
                        break;
                    } else {
                        // Check if last task ended at inventory
                        const lastTask = await this.taskRepository.findOne({ where: { task_id: robot.last_task_id } });
                        const endedAtInventory = lastTask?.end_location?.location_attribute?.attribute_value == 'inventory';

                        console.log(`Robot ${robot.robot_id} last task ${robot.last_task_id} ended at inventory: ${endedAtInventory}`);
                        if (endedAtInventory) {
                            assignedRobotId = robot.robot_id;
                            this.logger.log(`Assigning robot ${assignedRobotId} to task ${task.task_id} (no dependency, last task ended at inventory)`);
                            break;
                        }
                    }
                }
                if (!assignedRobotId) {
                    this.logger.warn(`No available robots for task ${task.task_id} (no dependency) - none meet assignment criteria`);
                    return null;
                }
            }

            if (assignedRobotId) {
                // Atomically update robot status
                const updateResult = await queryRunner.manager.update(Robot,
                    { robot_id: assignedRobotId}, // Ensure it's still available
                    { available: false, current_task_id: task.task_id }
                );

                if (updateResult.affected === 0) {
                    // Robot was taken by another process
                    this.logger.warn(`Robot ${assignedRobotId} was already assigned to another task`);
                    return null;
                }

                this.taskRobotAssignments.set(task.task_id, assignedRobotId);
                return assignedRobotId;
            }

            return null;
        } catch (error) {
            this.logger.error(`Error assigning robot to task ${task.task_id}:`, error);
            return null;
        }
    }


    // @Interval(2000)
    async checkBatchTaskStatus(): Promise<void> {
        if (this.isCheckBatchJobStatus) {
            this.logger.warn('Already checking batch job status, skipping this cycle');
            return;
        }
        
        // Set flag immediately
        this.isCheckBatchJobStatus = true;
        
        const queryRunner = this.batchJobRepository.manager.connection.createQueryRunner();
        
        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();
            
            // Use SELECT FOR UPDATE to lock the batch
            const pendingBatchJobs = await queryRunner.manager
                .createQueryBuilder(BatchJob, 'batch')
                .where('batch.status = :status', { status: 'pending' })
                .setLock('pessimistic_write') // This locks the rows
                .getMany();

            if (!pendingBatchJobs.length) {
                this.logger.log('No pending batch jobs found.');
                await queryRunner.commitTransaction();
                return; // ✅ Flag will be reset in finally block
            }

            for (const pendingBatchJob of pendingBatchJobs) {
                // Immediately update status to prevent other processes from picking it up
                await queryRunner.manager.update(BatchJob, 
                    { batch_job_id: pendingBatchJob.batch_job_id }, 
                    { status: 'processing_assignment' } // Temporary status
                );
                
                const tasks = await queryRunner.manager.find(Task, {
                    where: { batch_job: { batch_job_id: pendingBatchJob.batch_job_id }, status: 'pending' },
                });

                if (!tasks.length) {
                    // Revert status if no tasks
                    await queryRunner.manager.update(BatchJob, 
                        { batch_job_id: pendingBatchJob.batch_job_id }, 
                        { status: 'pending' }
                    );
                    continue; // Continue to next batch job
                }

                const task = tasks[0];
                console.log(`Processing task: ${JSON.stringify(task)}`);
                const assignedRobotId = await this.assignRobotToTaskWithLock(task, queryRunner);
                
                if (!assignedRobotId) {
                    // Revert status if no robot available
                    await queryRunner.manager.update(BatchJob, 
                        { batch_job_id: pendingBatchJob.batch_job_id }, 
                        { status: 'pending' }
                    );
                    continue; // Continue to next batch job
                }

                // Continue with processing...
                task.status = 'inqueue';
                await queryRunner.manager.save(task);
                
                // Update batch status to inqueue
                await queryRunner.manager.update(BatchJob, 
                    { batch_job_id: pendingBatchJob.batch_job_id }, 
                    { status: 'inqueue' }
                );
                
                await queryRunner.commitTransaction();
                
                // Process the task outside the transaction
                this.TaskQueue.push(task);
                
                // ✅ IMPORTANT: Use async/await properly here
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
                }
                
                return; // Process only one batch per cycle - flag will be reset in finally
            }
            
            await queryRunner.commitTransaction();
            
        } catch (error) {
            this.logger.error('Error checking batch job status:', error);
            try {
                await queryRunner.rollbackTransaction();
            } catch (rollbackError) {
                this.logger.error('Error rolling back transaction:', rollbackError);
            }
        } finally {
            // ✅ CRITICAL: Always release the query runner and reset the flag
            try {
                await queryRunner.release();
            } catch (releaseError) {
                this.logger.error('Error releasing query runner:', releaseError);
            }
            
            // ✅ ALWAYS reset the flag here - this is the most important fix
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
                    task.status = 'processing';
                    await this.taskRepository.save(task);
                    await this.wms_webhook({tasks: [task], existingBatchJob: existingBatchJob});

                    // Simulate task processing time of 0.5 seconds
                    await new Promise(resolve => setTimeout(resolve, 10000));

                    task.status = 'completed';
                    await this.taskRepository.save(task);
                    
                    // Robot remains assigned and unavailable until freed via external endpoint
                    // The robot will only be freed through the setRobotAvailable endpoint
                    
                    await this.wms_webhook({tasks: [task], existingBatchJob: existingBatchJob});
            }

            existingBatchJob.status = 'completed';

            await this.batchJobRepository.save(existingBatchJob);

            await this.wms_webhook({tasks: tasksToProcess, existingBatchJob: existingBatchJob});

        } catch (error) {
            this.logger.error('Error in task processor:', error);
        }
    }

    async webhook_payload(queueElement: { tasks: Task[], existingBatchJob: BatchJob }): Promise<any> {
        const batchJob = queueElement.existingBatchJob;
        const tasks = queueElement.tasks;
        // Create a default pagination object

        const robot = await this.robotRepository.findOne({
            where: { current_task_id: tasks[0].task_id || "UNASSIGNED" }
        })
        const robot_id = robot?.robot_id || "UNASSIGNED";

        const defaultPagination = {
            "pagination":{
                "current_page": 1,
                "total_pages": 3,
                "total_records": 12
            },
            "batch_job_id": batchJob.batch_job_id,
            "batch_priority": batchJob.batch_priority,
            "batch_job_status": batchJob.status,
            "timestamp": new Date().toISOString(),
            "tasks_status": tasks.map(task => ({
                "task_id": task.task_id,
                "status": task.status,
                "robot_id": robot_id, // Robot ID assigned to the task
                "start_location": task.start_location, // Assuming start_location_id is a Location object
                "end_location": task.end_location, // Assuming end_location_id is a Location object
                "cargos":task.cargos
            }))
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

    // Robot Management Methods
    
    /**
     * Get an available robot for task assignment (must have ended last task at inventory)
     */
    private async getAvailableRobot(): Promise<string | null> {
        try {
            const availableRobots = await this.robotRepository.find({
                where: { available: true }
            });
            
            if (availableRobots.length === 0) {
                this.logger.log('No available robots found');
                return null;
            }
            
            // Check each available robot to see if its last task ended at inventory
            for (const robot of availableRobots) {
                const canAssignRobot = await this.canAssignRobotForNewTask(robot.robot_id);
                if (canAssignRobot) {
                    this.logger.log(`Found available robot that ended last task at inventory: ${robot.robot_id}`);
                    return robot.robot_id;
                }
            }
            
            this.logger.warn('No available robots found that ended their last task at inventory');
            return null;
        } catch (error) {
            this.logger.error('Error getting available robot:', error);
            return null;
        }
    }
    
    /**
     * Check if a robot can be assigned to a new task (last task must have ended at inventory)
     */
    private async canAssignRobotForNewTask(robotId: string): Promise<boolean> {
        try {
            // Get the robot from the database
            const robot = await this.robotRepository.findOne({ where: { robot_id: robotId } });
            if (!robot) {
                this.logger.warn(`Robot ${robotId} not found in database`);
                return false;
            }
            const lastTaskId = robot.last_task_id;
            if (!lastTaskId) {
                // No previous completed task found for this robot, can assign
                this.logger.log(`Robot ${robotId} has no previous completed tasks, can be assigned`);
                return true;
            }
            // Get the last task entity
            const lastTaskEntity = await this.taskRepository.findOne({ where: { task_id: lastTaskId } });
            if (!lastTaskEntity) {
                this.logger.warn(`Could not find last task ${lastTaskId} for robot ${robotId}`);
                return false;
            }
            // Check if the last task ended at an inventory location
            const endLocation = lastTaskEntity.end_location;
            const endedAtInventory = endLocation?.location_attribute?.attribute_value === 'inventory';
            if (endedAtInventory) {
                this.logger.log(`Robot ${robotId} last task ${lastTaskId} ended at inventory (${endLocation.location_attribute?.attribute_value}), can be assigned`);
                return true;
            } else {
                this.logger.log(`Robot ${robotId} last task ${lastTaskId} did not end at inventory (ended at: ${endLocation?.location_attribute?.attribute_value || 'unknown'}), cannot be assigned`);
                return false;
            }
        } catch (error) {
            this.logger.error(`Error checking if robot ${robotId} can be assigned:`, error);
            return false;
        }
    }
    
    /**
     * Assign a robot to a task based on dependency logic
     */
    
    
    /**
     * Make a robot available manually (endpoint method)
     */
    async setRobotAvailable(robotId: string): Promise<boolean> {
        try {
            const robot = await this.robotRepository.findOne({
                where: { robot_id: robotId }
            });
            
            if (robot) {
                // Find the last task assigned to this robot (from the in-memory map)
                let lastTaskId: string | null = null;
                // for (const [taskId, assignedRobotId] of Array.from(this.taskRobotAssignments.entries()).reverse()) {
                //     if (assignedRobotId === robotId) {
                //         lastTaskId = taskId;
                //         break;
                //     }
                // }
                lastTaskId = robot.current_task_id;
                await this.robotRepository.update(
                    { robot_id: robotId },
                    { available: true, last_task_id: lastTaskId, current_task_id: null }
                );
                this.logger.log(`Robot ${robotId} set to available manually via database. Last task: ${lastTaskId}`);
                return true;
            }
            
            this.logger.warn(`Robot ${robotId} not found in database`);
            return false;
        } catch (error) {
            this.logger.error(`Error setting robot ${robotId} to available:`, error);
            return false;
        }
    }
    
    /**
     * Get status of all robots
     */
    async getRobotStatuses(): Promise<{ robotId: string; available: boolean }[]> {
        try {
            const robots = await this.robotRepository.find();
            return robots.map(robot => ({
                robotId: robot.robot_id,
                available: robot.available
            }));
        } catch (error) {
            this.logger.error('Error getting robot statuses:', error);
            return [];
        }
    }
    
    /**
     * Get all task-robot assignments
     */
    getTaskRobotAssignments(): { taskId: string; robotId: string }[] {
        return Array.from(this.taskRobotAssignments.entries()).map(([taskId, robotId]) => ({
            taskId,
            robotId
        }));
    }
    
    /**
     * Free all robots (for debugging/emergency use)
     */
    async freeAllRobots(): Promise<void> {
        try {
            await this.robotRepository.update({}, { available: true });
            this.logger.log('All robots have been freed via database update');
        } catch (error) {
            this.logger.error('Error freeing all robots:', error);
        }
    }
    
    /**
     * Delete all robots and truncate batch_tasks table (CASCADE)
     */
    async deleteAllRobotsAndBatches(): Promise<{ message: string; success: boolean }> {
        try {
            await this.robotRepository.clear();
            await this.batchJobRepository.query('TRUNCATE TABLE batch_tasks CASCADE');
            this.logger.log('All robots and batch_tasks deleted (TRUNCATE CASCADE)');
            return {
                message: 'All robots and batch_tasks deleted (TRUNCATE CASCADE)',
                success: true
            };
        } catch (error) {
            this.logger.error('Error deleting robots and batch_tasks:', error);
            return {
                message: 'Error deleting robots and batch_tasks',
                success: false
            };
        }
    }

    /**
     * Check if any robots are available
     */
    private async hasAvailableRobots(): Promise<boolean> {
        try {
            const availableRobot = await this.robotRepository.findOne({
                where: { available: true }
            });
            return !!availableRobot;
        } catch (error) {
            this.logger.error('Error checking for available robots:', error);
            return false;
        }
    }

    /**
     * Initialize robots in database if they don't exist
     */
    private async initializeRobots(): Promise<void> {
        try {
            const robotIds = ['ROBOT-001', 'ROBOT-002'];
            
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
