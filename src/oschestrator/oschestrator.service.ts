import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch, Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from 'src/robot-job/entities/batch_task.entity';
import { TaskGenerationReq } from 'src/robot-job/dto/Task_Generation.dto';
import { queueElementDto } from './dto/queue.dto';
import axios from 'axios';
import { promises } from 'dns';
import { queue } from 'rxjs';

@Injectable()
export class OschestratorService {
    private readonly logger = new Logger(OschestratorService.name);
    private readonly taskQueue: queueElementDto[] = [];

    private TaskQueue: Task[] = []
    private isCheckBatchJobStatus = false;
    private isTaskQueueProcessing = false;

    private isProcessing = false;
    constructor (
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(BatchJob)
        private readonly batchJobRepository: Repository<BatchJob>,
        
    ){}

    // private async createWebhookPayload(queueElementDto: queueElementDto): Promise<any> {
    //     const batchJob = queueElementDto.batchJob.batchJob;

    //     const defaultPagination = {
    //         "pagination":{
    //             "current_page": 1,
    //             "total_pages": 3,
    //             "total_records": 12
    //         },
    //         "batch_job_id": batchJob.batch_job_id,
    //         "batch_priority": batchJob.batch_priority,
    //         "batch_job_status": batchJob.status,
    //         "timestamp": new Date().toISOString(),
    //         "tasks_status": queueElementDto.tasks.map(task => ({
    //             "task_id": task.task_id,
    //             "status": task.status,
    //             "robot_id": "ROBOT-001", // Placeholder for robot ID
    //             "start_location": task.start_location, // Assuming start_location_id is a Location object
    //             "end_location": task.end_location, // Assuming end_location_id is a Location object
    //             "cargos":task.cargos
    //         }))
    //     }
    //     return defaultPagination;

    // }

    // async collectTasks(queueElementDto: queueElementDto): Promise<void> {
    //     const batch_job = queueElementDto.batchJob.batchJob;
    //     batch_job.status = 'inqueue';
    //     await this.batchJobRepository.save(batch_job);
    //     for (const task of queueElementDto.tasks) {
    //         task.status = 'inqueue';
    //         task.batch_job = batch_job; // Associate task with the batch job
    //         await this.taskRepository.save(task);
    //         this.logger.log(`Task ${task.task_id} added to queue.`);
    //     }
    //     this.taskQueue.push(queueElementDto);
    //     await this.wms_url_webhook(queueElementDto);
    //     this.logger.log(`Task added to queue: ${queueElementDto.batchJob.batchJob.batch_job_id}`);
    // }

    // @Interval(20000) // Adjust the interval as needed
    // async processTaskQueue(): Promise<void> {
    //     if (this.isProcessing) {
    //         this.logger.warn('Already processing tasks, skipping this cycle');
    //         return;
    //     }
    //     if (this.taskQueue.length === 0) {
    //         this.logger.log('No tasks in queue, waiting for new tasks...');
    //         return;
    //     }

    //     // Set processing flag to prevent concurrent processing
    //     this.isProcessing = true;
    //     this.logger.log('Starting task processing cycle...');
    //     try {
    //         // Get all tasks and clear the queue
    //         const tasksToProcess = [...this.taskQueue];
    //         this.taskQueue.length = 0; // Clear the queue

    //         for (const queueElement of tasksToProcess) {
    //             const existingBatchJob = await this.batchJobRepository.findOne({
    //                 where: { batch_job_id: queueElement.batchJob.batchJob.batch_job_id },
    //             });
    //             if (!existingBatchJob) {
    //                 this.logger.warn(`Batch job ${queueElement.batchJob.batchJob.batch_job_id} does not exist or Cancelled. Skipping.`);
    //                 continue;
    //             }
    //             const batchJob = queueElement.batchJob.batchJob;
    //             batchJob.status = 'processing';
    //             await this.batchJobRepository.save(batchJob);

    //             for (const task of queueElement.tasks) {
    //                 const existingTask = await this.taskRepository.findOne({
    //                     where: { task_id: task.task_id },
    //                 });
    //                 if (!existingTask) {
    //                     this.logger.warn(`Task ${task.task_id} does not exist or was cancelled. Skipping.`);
    //                     continue;
    //                 }
    //                 task.status = 'processing';
    //                 await this.wms_url_webhook({batchJob: queueElement.batchJob, tasks: [task]});
    //                 await this.taskRepository.save(task);

    //                 // Simulate task processing time of 0.5 seconds
    //                 await new Promise(resolve => setTimeout(resolve, 500));

    //                 task.status = 'completed';
    //                 await this.taskRepository.save(task);
    //                 await this.wms_url_webhook({batchJob: queueElement.batchJob, tasks: [task]});
    //             }

    //             batchJob.status = 'completed';
    //             await this.batchJobRepository.save(batchJob);

    //             await this.wms_url_webhook(queueElement);

    //         }
    //     } catch (error) {
    //         this.logger.error('Error in task processor:', error);
    //     } finally {
    //         this.isProcessing = false;
    //     }
    // }

    // async wms_url_webhook(queueElementDto: queueElementDto): Promise<any> {
    //     const payload = await this.createWebhookPayload(queueElementDto);
    //     const warehouseId = queueElementDto.batchJob.warehouseId;
    //     const response = await axios.post(
    //         `http://localhost:6789/api/webhook/${warehouseId}/task_status_update_webhook`,
    //         payload,
    //         {
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         }
    //     );
    //     return response;


    // }
    // async orchestrate(queueElementDto: queueElementDto): Promise<void> {
    //     try {
    //         await this.collectTasks(queueElementDto);
    //     } catch (error) {
    //         this.logger.error('Error in orchestrator cycle:', error);
    //     } finally {
    //         this.logger.log('Batch Successfully Pushed to Queue');
    //     }
    // }

    @Interval(60000) // Check every minute
    async checkBatchTaskStatus(): Promise<void> {
        if (this.isCheckBatchJobStatus) {
            this.logger.warn('Already checking batch job status, skipping this cycle');
            return;
        }
        try{
            this.isCheckBatchJobStatus = true;
            const pendingBatchJob = await this.batchJobRepository.findOne({
                where: { status: 'pending' },
            });
            if (pendingBatchJob) {
                this.logger.log(`Found pending batch job: ${pendingBatchJob.batch_job_id}`);
                const tasks = await this.taskRepository.find({
                    where: { batch_job: { batch_job_id: pendingBatchJob.batch_job_id } },
                });
                for (const task of tasks) {
                    task.status = 'inqueue'; // Update task status to inqueue
                    await this.taskRepository.save(task);
                    this.TaskQueue.push(task);
                }
                pendingBatchJob.status = 'inqueue'; // Update batch job status to inqueue
                await this.batchJobRepository.save(pendingBatchJob);
                
                this.logger.log(`All pending tasks for batch job ${pendingBatchJob.batch_job_id} have been updated to inqueue.`);
            } else {
                this.logger.log('No pending batch jobs found.');
            }
        }
        catch (error) {
            this.logger.error('Error checking batch job status:', error);
        } finally {
            this.isCheckBatchJobStatus = false;
        }
    }

    @Interval(60000)
    async processTaskQueueInterval(): Promise<void> {
        if (this.isTaskQueueProcessing){
            this.logger.warn('Already processing task queue, skipping this cycle');
            return;
        }
        if (this.TaskQueue.length === 0) {
            this.logger.log('No tasks in TaskQueue, waiting for new tasks...');
            return;
        }
        try {
            // Get all tasks and clear the queue
            const tasksToProcess : Task[] = [...this.TaskQueue];
            this.TaskQueue.length = 0; // Clear the queue

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
                    await new Promise(resolve => setTimeout(resolve, 500));

                    task.status = 'completed';
                    await this.taskRepository.save(task);
                    await this.wms_webhook({tasks: [task], existingBatchJob: existingBatchJob});
            }

            existingBatchJob.status = 'completed';

            await this.batchJobRepository.save(existingBatchJob);

            await this.wms_webhook({tasks: tasksToProcess, existingBatchJob: existingBatchJob});
        } catch (error) {
            this.logger.error('Error in task processor:', error);
        } finally {
            this.isTaskQueueProcessing = false;
        }
    }

    async webhook_payload(queueElement: { tasks: Task[], existingBatchJob: BatchJob }): Promise<any> {
        const batchJob = queueElement.existingBatchJob;
        const tasks = queueElement.tasks;
        // Create a default pagination object

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
                "robot_id": "ROBOT-001", // Placeholder for robot ID
                "start_location": task.start_location, // Assuming start_location_id is a Location object
                "end_location": task.end_location, // Assuming end_location_id is a Location object
                "cargos":task.cargos
            }))
        }
        return defaultPagination;
    }
    async wms_webhook(queueElement: { tasks: Task[], existingBatchJob: BatchJob }): Promise<any> {
        const payload = await this.webhook_payload(queueElement);
        const warehouseId =  1 // Assuming all tasks belong to the same warehouse
        const response = await axios.post(
            `http://localhost:6789/api/webhook/${warehouseId}/task_status_update_webhook`,
            payload,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        return response;
    }

}
