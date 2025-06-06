import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../robot-job/entities/task.entity';
import { BatchJob } from 'src/robot-job/entities/batch_task.entity';
import { TaskGenerationReq } from 'src/robot-job/dto/Task_Generation.dto';

@Injectable()
export class OschestratorService {
    private readonly logger = new Logger(OschestratorService.name);
    private readonly taskQueue: Task[] = [];
    private isProcessing = false;
    constructor (
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,

        @InjectRepository(BatchJob)
        private readonly batchJobRepository: Repository<BatchJob>,
        
    ){}

    

    async collectTasks(newBatchJob: BatchJob, newTasks: Task[]): Promise<void> {
        for (const task of newTasks) {
            this.logger.log(`Processing task: ${task.task_id}`);
            task.status = 'processing';
            this.taskQueue.push(task);
            await this.taskRepository.save(task);
        }
    }

    @Interval(10000) // Adjust the interval as needed
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
        

            const taskPromises = tasksToProcess.map(task => async ()=>{
                task.status = 'processing';
                this.taskRepository.save(task);
                new Promise<void>((resolve) => {
                    setTimeout(() => {
                        this.logger.log(`Processed task: ${task.task_id}`);
                        resolve();
                    }, 1000);
                })
            }
                
            );
            const results = await Promise.allSettled(taskPromises);

            for (let i = 0; i < results.length; i++) {
                if (results[i].status === 'fulfilled') {
                    const task = tasksToProcess[i];
                    task.status = 'completed';
                    await this.taskRepository.save(task);
                    this.logger.log(`Task ${task.task_id} completed successfully.`);
                }
            }

        } catch (error) {
            this.logger.error('Error in task processor:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    async orchestrate(newBatchJob: BatchJob, newTasks: Task[]): Promise<void> {
        
        try {
            await this.collectTasks(newBatchJob, newTasks);

        } catch (error) {
            this.logger.error('Error in orchestrator cycle:', error);
        } finally {
            this.logger.log('Batch Successfully Pushed to Queue');
        }
    }

    @Interval(10000)
    async collectBatchJob(newBatchJob: BatchJob): Promise<void> {
        this.logger.log("Collecting batch job and accessing their status.");
        const pendingBatches = await this.batchJobRepository.find({ where: { status: 'pending' } });
        for (const batch of pendingBatches) {
            const tasks = await this.taskRepository.find({ where: { batch_job: batch } });
            const hasIncompleteTask = tasks.some(task => task.status !== 'completed');
            if (hasIncompleteTask) {
                continue;
            }
            else{
                batch.status = 'completed';
                await this.batchJobRepository.save(batch);
                this.logger.log(`Batch job ${batch.batch_job_id} completed successfully.`);
            }
        }
    }
}
