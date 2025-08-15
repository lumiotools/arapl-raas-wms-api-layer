import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Batch, Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from '../robot-job/entities/batch_task.entity';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
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

    constructor (
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(BatchJob)
        private readonly batchJobRepository: Repository<BatchJob>,

        @InjectRepository(Warehouse)
        private readonly warehouseRepository: Repository<Warehouse>,
    ) { }


    // @Interval(60000) // Check every minute
    // async checkBatchTaskStatus(): Promise<void> {
    //     if (this.isCheckBatchJobStatus) {
    //         // currently checking batch job status, skip this cycle
    //         this.logger.warn('Already checking batch job status, skipping this cycle');
    //         return;
    //     }
    //     try{
    //         this.isCheckBatchJobStatus = true;
    //         // find the first batch that is pendingg
    //         const pendingBatchJob = await this.batchJobRepository.findOne({
    //             where: { status: 'pending' },
    //         });
    //         if (pendingBatchJob) {
    //             await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate a delay of 1 second
    //             // Found a pending batch job, process it
    //             this.logger.log(`Found pending batch job: ${pendingBatchJob.batch_job_id}`);
    //             const tasks = await this.taskRepository.find({
    //                 where: { batch_job: { batch_job_id: pendingBatchJob.batch_job_id }, status: 'pending' },
    //             });
    //             for (const task of tasks) {
    //                 task.status = 'inqueue'; // Update task status to inqueue
    //                 await this.taskRepository.save(task);
    //                 this.TaskQueue.push(task);
    //             }
    //             pendingBatchJob.status = 'inqueue'; // Update batch job status to inqueue
    //             await this.batchJobRepository.save(pendingBatchJob);

    //             await this.wms_webhook({tasks: tasks, existingBatchJob: pendingBatchJob});

    //             const tasksToProcess : Task[] = [...this.TaskQueue];
    //             this.TaskQueue.length = 0; // clear the TaskQueue after processing
    //             await this.processTaskQueueInterval(tasksToProcess);
                
    //             this.logger.log(`All pending tasks for batch job ${pendingBatchJob.batch_job_id} have been updated to inqueue.`);
    //         } else {
    //             this.logger.log('No pending batch jobs found.');
    //         }
    //     }
    //     catch (error) {
    //         this.logger.error('Error checking batch job status:', error);
    //     } finally {
    //         this.isCheckBatchJobStatus = false;
    //     }
    // }

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

}
