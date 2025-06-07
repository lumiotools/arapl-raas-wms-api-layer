import { Inject, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { TaskGenerationReq, TaskGenerationRes } from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import axios from 'axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity'; // Adjust the import path as necessary
import { OschestratorService } from 'src/oschestrator/oschestrator.service'; // Adjust the import path as necessary
import { queueElementDto } from 'src/oschestrator/dto/queue.dto';
import { queue } from 'rxjs';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { Location } from './entities/locations.entity'; // Adjust the import path as necessary
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';



/*
      task orchestration: pick tasks in pending state and process (dummy) and put in queue
      after in queue, -> main logic later (inqueue to  processing (proess for sometime)) -> completed

    */

@Injectable()
export class RobotJobService {

  constructor(
    @InjectRepository(BatchJob)
    private readonly BatchJobRepository: Repository<BatchJob>,

    @InjectRepository(Task)
    private readonly TaskRepository: Repository<Task>,

    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,

    private readonly oschestratorService: OschestratorService, // Inject the orchestrator service
  ){}

  async createTask(warehouseId: string, createRobotJobDto: TaskGenerationReq): Promise<TaskGenerationRes> {
    const newBatchJob: BatchJob = this.BatchJobRepository.create({
      batch_job_id: createRobotJobDto.batch_job_id,
      batch_priority: createRobotJobDto.batch_priority,
      batch_type: createRobotJobDto.batch_type,
      batch_frequency: createRobotJobDto.batch_frequency,
    });
    await this.BatchJobRepository.save(newBatchJob);

    const newTasks: Task[] = []
    const Tasks: any[] = createRobotJobDto.tasks;
    for (const task of Tasks) {
      const newTask = this.TaskRepository.create({
        task_id: task.task_id,
        task_pallet_id: task.task_pallet_id,
        task_type: task.task_type,
        task_dependency: task.task_dependency,
        start_location: task.start_location,
        end_location: task.end_location,
        wait_time: task.wait_time,
        cargos: task.cargos,
        batch_job: newBatchJob,
      });
    
      await this.TaskRepository.save(newTask);
      newTasks.push(newTask);
    }

    const queueElementDto: queueElementDto = {
      batchJob: {
        batchJob: newBatchJob,
        warehouseId: warehouseId,
      },
      tasks: newTasks,
    }
    
    await this.oschestratorService.orchestrate(queueElementDto); 

    return {
      batch_job_id: createRobotJobDto.batch_job_id,
      status: 'success',
    };
  }

  async updateTask(warehouse_id: string, updateRobotJobDto: TaskUpdateReq): Promise<TaskUpdateRes> {
    const tasks: UpdateTask[] = updateRobotJobDto.updates;
    for (const task of tasks) {
      const taskRepo: Task | null = await this.TaskRepository.findOne({ where: { task_id: task.task_id, batch_job: { batch_job_id: updateRobotJobDto.batch_job_id } }, relations: ['batch_job'] });
      if (!taskRepo) {
        console.log(`Task with ID ${task.task_id} not found.`);
        continue;
      }
      taskRepo.task_dependency = task.task_dependency ?? taskRepo.task_dependency;

      taskRepo.start_location.location_id = task.start_location.location_id;
      taskRepo.start_location.location_dimension = task.start_location.location_dimension;

      taskRepo.end_location.location_id = task.end_location.location_id;
      taskRepo.end_location.location_dimension = task.end_location.location_dimension;
      
      taskRepo.wait_time = task.wait_time;

      for (const cargo of task.cargos) {
        const existingCargo = taskRepo.cargos.find(c => c.cargo_code === cargo.cargo_code);
        if (existingCargo) {
          existingCargo.cargo_dimension = cargo.cargo_dimension;
          existingCargo.cargo_weight = cargo.cargo_weight ?? existingCargo.cargo_weight;
        }
      }
      await this.TaskRepository.save(taskRepo);
    }

    if (tasks.length === 0) {
      return {
        task_id: '',
        status: 'no_updates',
        updated_at: new Date().toISOString(),
        message: 'No tasks to update.',
      };
    }

    return {
      task_id: tasks[0].task_id,
      status: 'success',
      updated_at: new Date().toISOString(),
      message: 'Tasks updated successfully',
    };
  }

  async cancelTask(warehouse_id: string, updateRobotJobDto: TaskCancelReq | BatchCancelReq): Promise<TaskCancelRes | BatchCancelRes> {
    if ('batch_job_id' in updateRobotJobDto) {
      // Handle batch cancellation
      const batchJob = await this.BatchJobRepository.findOne({ where: { batch_job_id: updateRobotJobDto.batch_job_id }});
      if (!batchJob) {
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'not_found',
          cancelled_at: new Date().toISOString(),
          message: `Batch job with ID ${updateRobotJobDto.batch_job_id} not found.`,
        };
      }
      const tasks = await this.TaskRepository.find({ where: { batch_job: batchJob} });
      if (tasks.length === 0) {
        return {
          task_id: '',
          status: 'no_tasks',
          cancelled_at: new Date().toISOString(),
          message: `No tasks found for batch job with ID ${updateRobotJobDto.batch_job_id}.`,
        };
      }
      await this.BatchJobRepository.remove(batchJob);
      return {
        task_id: tasks[0].task_id,
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        message: `Batch job with ID ${updateRobotJobDto.batch_job_id} and its tasks have been cancelled.`,
      };
    }
    const task_id = updateRobotJobDto.task_id;
    const taskRepo: Task | null =  await this.TaskRepository.findOne({ where: {task_id: task_id }});
    if (!taskRepo) {
      return {
        task_id: task_id,
        status: 'not_found',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} not found.`,
      };
    }
    if (taskRepo.status === 'completed'){
      return {
        task_id: task_id,
        status: 'already_completed',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} is already completed and cannot be cancelled.`,
      };
    }
    await this.TaskRepository.remove(taskRepo);
    return {
      task_id: task_id,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      message: `Task with ID ${task_id} has been cancelled.`,
    };
  }

  async getEmptyLocations(warehouseId: string, getLocationReq: GetLocationReq): Promise<GetLocationRes> {
    const locations = await this.LocationRepository.find({
      where: {
        location_zone: getLocationReq.zone_id,
        location_action: getLocationReq.location_type,
        isEmpty: true,
      },
    });

    if (locations.length === 0) {
      return {
        zone_id: getLocationReq.zone_id,
        available_location_types: [],
      };
    }

    
    if (getLocationReq.location_type === 'Drop') {
      locations.sort((a, b) => (a.dropPriority ?? 0) - (b.dropPriority ?? 0));
    }
    else if (getLocationReq.location_type === 'Pick') {
      locations.sort((a, b) => (a.pickupPriority ?? 0) - (b.pickupPriority ?? 0));
    }
    return {
      zone_id: getLocationReq.zone_id,
      available_location_types: locations,
    };
  }

  create(createRobotJobDto: CreateRobotJobDto) {
    return 'This action adds a new robotJob';
  }

  findAll() {
    return `This action returns all robotJob`;
  }

  findOne(id: number) {
    return `This action returns a #${id} robotJob`;
  }

  update(id: number, updateRobotJobDto: UpdateRobotJobDto) {
    return `This action updates a #${id} robotJob`;
  }

  remove(id: number) {
    return `This action removes a #${id} robotJob`;
  }
}
