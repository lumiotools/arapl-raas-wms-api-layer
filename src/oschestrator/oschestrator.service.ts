import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from 'src/robot-job/entities/batch_task.entity';
import { TaskGenerationReq } from 'src/robot-job/dto/Task_Generation.dto';
import { queueElementDto } from './dto/queue.dto';
import axios from 'axios';

@Injectable()
export class OschestratorService {
    private readonly logger = new Logger(OschestratorService.name);
    private readonly taskQueue: queueElementDto[] = [];
    private isProcessing = false;
    constructor (
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(BatchJob)
        private readonly batchJobRepository: Repository<BatchJob>,
        
    ){}

    private async createWebhookPayload(queueElementDto: queueElementDto): Promise<any> {
        const batchJob = queueElementDto.batchJob.batchJob;

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
            "tasks_status": queueElementDto.tasks.map(task => ({
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

    async collectTasks(queueElementDto: queueElementDto): Promise<void> {
        const batch_job = queueElementDto.batchJob.batchJob;
        batch_job.status = 'inqueue';
        await this.batchJobRepository.save(batch_job);
        for (const task of queueElementDto.tasks) {
            task.status = 'inqueue';
            task.batch_job = batch_job; // Associate task with the batch job
            await this.taskRepository.save(task);
            this.logger.log(`Task ${task.task_id} added to queue.`);
        }
        this.taskQueue.push(queueElementDto);
        await this.wms_url_webhook(queueElementDto);
        this.logger.log(`Task added to queue: ${queueElementDto.batchJob.batchJob.batch_job_id}`);
    }

    @Interval(20000) // Adjust the interval as needed
    async processTaskQueue(): Promise<void> {
        if (this.isProcessing) {
            this.logger.warn('Already processing tasks, skipping this cycle');
            return;
        }
        if (this.taskQueue.length === 0) {
            this.logger.log('No tasks in queue, waiting for new tasks...');
            return;
        }

        // Set processing flag to prevent concurrent processing
        this.isProcessing = true;
        this.logger.log('Starting task processing cycle...');
        try {
            // Get all tasks and clear the queue
            const tasksToProcess = [...this.taskQueue];
            this.taskQueue.length = 0; // Clear the queue

            for (const queueElement of tasksToProcess) {
                const existingBatchJob = await this.batchJobRepository.findOne({
                    where: { batch_job_id: queueElement.batchJob.batchJob.batch_job_id },
                });
                if (!existingBatchJob) {
                    this.logger.warn(`Batch job ${queueElement.batchJob.batchJob.batch_job_id} does not exist or Cancelled. Skipping.`);
                    continue;
                }
                const batchJob = queueElement.batchJob.batchJob;
                batchJob.status = 'processing';
                await this.batchJobRepository.save(batchJob);

                for (const task of queueElement.tasks) {
                    const existingTask = await this.taskRepository.findOne({
                        where: { task_id: task.task_id },
                    });
                    if (!existingTask) {
                        this.logger.warn(`Task ${task.task_id} does not exist or was cancelled. Skipping.`);
                        continue;
                    }
                    task.status = 'processing';
                    await this.wms_url_webhook({batchJob: queueElement.batchJob, tasks: [task]});
                    await this.taskRepository.save(task);

                    // Simulate task processing time of 0.5 seconds
                    await new Promise(resolve => setTimeout(resolve, 500));

                    task.status = 'completed';
                    await this.taskRepository.save(task);
                    await this.wms_url_webhook({batchJob: queueElement.batchJob, tasks: [task]});
                }

                batchJob.status = 'completed';
                await this.batchJobRepository.save(batchJob);

                await this.wms_url_webhook(queueElement);

            }
        } catch (error) {
            this.logger.error('Error in task processor:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async wms_url_webhook(queueElementDto: queueElementDto): Promise<any> {
        const payload = await this.createWebhookPayload(queueElementDto);
        const warehouseId = queueElementDto.batchJob.warehouseId;
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
    async orchestrate(queueElementDto: queueElementDto): Promise<void> {
        try {
            await this.collectTasks(queueElementDto);
        } catch (error) {
            this.logger.error('Error in orchestrator cycle:', error);
        } finally {
            this.logger.log('Batch Successfully Pushed to Queue');
        }
    }
}
