import { Inject, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { Attribute, Cargo, TaskGenerationReq, TaskGenerationRes } from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { Task as TaskReq } from './dto/Task_Generation.dto';
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
import * as fs from 'fs/promises';
import { start } from 'repl';
import { json } from 'stream/consumers';
import { PartialType } from '@nestjs/mapped-types';



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
    
    // await this.oschestratorService.orchestrate(queueElementDto); 

    return {
      batch_job_id: createRobotJobDto.batch_job_id,
      status: 'success',
    };
  }

  unstructureHelper(input: any, expression: string): any{
    try {
        if (expression === 'null'){
          return [true, null];
        }
        // Split the property path into individual keys
        const keys = expression.split('.').slice(1);
        console.log('keys', keys);
        
        // Start with the input object
        let current = input;
        
        // Traverse through each key in the path
        for (const key of keys) {
            if (current === null || current === undefined) {
                return [false, null];
            }
            
            if (typeof current !== 'object') {
                return [false, null];
            }
            
            if (!(key in current)) {
                return [false, null];
            }
            
            current = current[key];
        }
        
        return [true, current];
    } catch (e) {
        return [false, null];
    }
  }
  async transform(input: any, jsonData: any): Promise<any> {
    const Tasks: TaskReq[] = [];
      let taskArray = this.unstructureHelper(input, jsonData['tasks'].source);
      if (!taskArray[0]) {
        return {
          status: 'error',
          message: "Didn't find the task array in the input data",
        };
      }
      taskArray = taskArray[1];
      if (!Array.isArray(taskArray)) {
        return {
          status: 'error',
          message: 'Task array is not an array',
        };
      }
      if (taskArray.length === 0) {
        return {
          status: 'error',
          message: 'Task array is empty',
        };
      }

      for (const op of taskArray){
        const map = jsonData['tasks']['map'];

        let task_id = this.unstructureHelper(op, map['task_id']); //*
        let task_type = this.unstructureHelper(op, map['task_type']); //*
        let task_pallet_id = this.unstructureHelper(op, map['task_pallet_id']);
        let task_dependency = this.unstructureHelper(op, map['task_dependency']);


        let start_location_id = this.unstructureHelper(op, map['start_location_id']);//*
        let start_location_action = this.unstructureHelper(op, map['start_location_action']);//*
        let start_location_dimension_length = this.unstructureHelper(op, map['start_location_dimension_length']);//*
        let start_location_dimension_width = this.unstructureHelper(op, map['start_location_dimension_width']);//*
        let start_location_dimension_height = this.unstructureHelper(op, map['start_location_dimension_height']);//*
        let start_location_zone = this.unstructureHelper(op, map['start_location_zone']);
        let start_location_attribute_name = this.unstructureHelper(op, map['start_location_attribute_name']);
        let start_location_attribute_value = this.unstructureHelper(op, map['start_location_attribute_value']);

        let end_location_id = this.unstructureHelper(op, map['end_location_id']);
        let end_location_action = this.unstructureHelper(op, map['end_location_action']);
        let end_location_dimension_length = this.unstructureHelper(op, map['end_location_dimension_length']);
        let end_location_dimension_width = this.unstructureHelper(op, map['end_location_dimension_width']);
        let end_location_dimension_height = this.unstructureHelper(op, map['end_location_dimension_height']);
        let end_location_zone = this.unstructureHelper(op, map['end_location_zone']);
        let end_location_attribute_name = this.unstructureHelper(op, map['end_location_attribute_name']);
        let end_location_attribute_value = this.unstructureHelper(op, map['end_location_attribute_value']);

        let wait_time_wait_type = this.unstructureHelper(op, map['wait_time_wait_type']);
        let wait_time_start_location_wait_time = this.unstructureHelper(op, map['wait_time_start_location_wait_time']);
        let wait_time_end_location_wait_time = this.unstructureHelper(op, map['wait_time_end_location_wait_time']);

        if (task_id[0] === false || task_type[0] === false || start_location_id[0] === false ||
            start_location_action[0] === false || start_location_dimension_length[0] === false ||
            start_location_dimension_width[0] === false || start_location_dimension_height[0] === false ||
            end_location_id[0] === false || end_location_action[0] === false ||
            end_location_dimension_length[0] === false || end_location_dimension_width[0] === false ||
            end_location_dimension_height[0] === false || wait_time_wait_type[0] === false ||
            wait_time_start_location_wait_time[0] === false || wait_time_end_location_wait_time[0] === false || start_location_zone[0] === false ||
            end_location_zone[0] === false || start_location_attribute_name[0] === false ||
            start_location_attribute_value[0] === false || end_location_attribute_name[0] === false || end_location_attribute_value[0] === false) {
          return {
            status: 'error',
            message: 'Failed to unstructure task data',
          };
        }

        let cargos = this.unstructureHelper(op, map['cargos'].source);
        if (!cargos[0]) {
          return {
            status: 'error',
            message: 'Failed to unstructure cargos data',
          };
        }
        cargos = cargos[1];
        const CARGOLIST: Cargo[] = [];
        const mapCargos = map['cargos']['map'];
        for (let i = 0; i < cargos.length; i++) {
          const item = cargos[i];
          let cargo_code = this.unstructureHelper(item,mapCargos['cargo_code']);
          let cargo_type = this.unstructureHelper(item,mapCargos['cargo_type']);
          let cargo_dimension_length = this.unstructureHelper(item,mapCargos['cargo_dimension_length']);
          let cargo_dimension_width = this.unstructureHelper(item,mapCargos['cargo_dimension_width']);
          let cargo_dimension_height = this.unstructureHelper(item,mapCargos['cargo_dimension_height']);
          let cargo_weight = this.unstructureHelper(item,mapCargos['cargo_weight']);
          let cargo_attributes_name = this.unstructureHelper(item,mapCargos['cargo_attributes_name']);
          let cargo_attributes_value = this.unstructureHelper(item,mapCargos['cargo_attributes_value']);



          if (cargo_code[0] === false || cargo_dimension_length[0] === false || cargo_dimension_width[0] === false ||
              cargo_dimension_height[0] === false || cargo_weight[0] === false || cargo_attributes_name[0] === false ||
              cargo_attributes_value[0] === false) {
            return {
              status: 'error',
              message: 'Failed to unstructure cargo data',
            };
          }
          
          CARGOLIST.push({
            cargo_code: cargo_code[1],
            cargo_type: cargo_type[1] ? cargo_type[1] : null,
            cargo_dimension: {
              length: cargo_dimension_length[1] ? cargo_dimension_length[1] : null,
              width: cargo_dimension_width[1] ? cargo_dimension_width[1] : null,
              height: cargo_dimension_height[1] ? cargo_dimension_height[1] : null,
            },
            cargo_weight: cargo_weight[1] ? cargo_weight[1] : null,
            cargo_attributes: {
              attribute_name: cargo_attributes_name[1] ? cargo_attributes_name[1] : null,
              attribute_value: cargo_attributes_value[1] ? cargo_attributes_value[1] : null,
            } as Attribute,
          });
        }

        const task: TaskReq = {
          task_id: task_id[1],
          task_pallet_id: task_pallet_id[1] ? task_pallet_id[1] : null,
          task_type: task_type[1] ? task_type[1] : 'Crossdock',
          task_dependency: task_dependency[1] ? task_dependency[1] : null,
          start_location: {
            location_id: start_location_id[1],
            location_zone: start_location_zone[1] ? start_location_zone[1] : null,
            location_action: start_location_action[1] ? start_location_action[1] : 'Nop',
            location_dimension: {
              length: start_location_dimension_length[1] ? start_location_dimension_length[1] : null,
              width: start_location_dimension_width[1] ? start_location_dimension_width[1] : null,
              height: start_location_dimension_height[1] ? start_location_dimension_height[1] : null,
            },
            location_attribute: {
              attribute_name: start_location_attribute_name[1] ? start_location_attribute_name[1] : null,
              attribute_value: start_location_attribute_value[1] ? start_location_attribute_value[1] : null,
            }
          },
          end_location: {
            location_id: end_location_id[1],
            location_zone: end_location_zone[1] ? end_location_zone[1] : null,
            location_action: end_location_action[1] ? end_location_action[1] : 'Nop',
            location_dimension: {
              length: end_location_dimension_length[1] ? end_location_dimension_length[1] : null,
              width: end_location_dimension_width[1] ? end_location_dimension_width[1] : null,
              height: end_location_dimension_height[1] ? end_location_dimension_height[1] : null,
            },
            location_attribute: {
              attribute_name: end_location_attribute_name[1] ? end_location_attribute_name[1] : null,
              attribute_value: end_location_attribute_value[1] ? end_location_attribute_value[1] : null,
            }
          },
          cargos: CARGOLIST,
          wait_time: {
            wait_type: wait_time_wait_type[1] ? wait_time_wait_type[1] : 'None',
            start_location_wait_time: wait_time_start_location_wait_time[1] ? wait_time_start_location_wait_time[1] : 0,
            end_location_wait_time: wait_time_end_location_wait_time[1] ? wait_time_end_location_wait_time[1] : 0,
          }
        };
        Tasks.push(task);

      }

      let batch_job_id = this.unstructureHelper(input, jsonData['batch_job_id']);
      let batch_priority = this.unstructureHelper(input, jsonData['batch_priority']);
      let batch_type = this.unstructureHelper(input, jsonData['batch_type']);
      let batch_frequency = this.unstructureHelper(input, jsonData['batch_frequency']);

      if (batch_job_id[0]===false || batch_priority[0] === false || batch_type[0] === false || batch_frequency[0] === false) {
        return {
          status: 'error',
          message: 'Failed to unstructure batch job data',
        };
      }

      const TaskReq: TaskGenerationReq = {
        batch_job_id: batch_job_id[1],
        batch_priority: batch_priority[1] ? batch_priority[1] : 5,
        batch_type: batch_type[1] ? batch_type[1] : 'Discrete',
        batch_frequency: batch_frequency[1] ? batch_frequency[1] : null,
        tasks: Tasks,
      }
      return TaskReq;
  }
  async createUnstructuredTask (warehouseId: string, input: any, config_id: number): Promise<any> {
    const filePath = `src/config/data_config/${config_id}.json`; 
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const taskrequest = await this.transform(input, jsonData);


      const response = await this.createTask(warehouseId, taskrequest);
      return {
        status: 'success',
        message: 'Unstructured task created successfully',
        batch_job_id: response.batch_job_id,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to load JSON: ${error.message}`,
      };
    }
    // Evaluate the expression in jsonData.batch_job_id using input as context
    
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
      const tasks = await this.TaskRepository.find({ where: { batch_job: { batch_job_id: updateRobotJobDto.batch_job_id } } });
      
      if (tasks.length === 0) { 
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'not_found',
          cancelled_at: new Date().toISOString(),
          message: `No tasks found for batch job with ID ${updateRobotJobDto.batch_job_id}.`,
        };

      }
      if (batchJob.status !== 'pending') {
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'already_completed',
          cancelled_at: new Date().toISOString(),
          message: `Batch job with ID ${updateRobotJobDto.batch_job_id} is not in pending state and cannot be cancelled.`,
        }
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
    if (taskRepo.status !== 'pending') {
      return {
        task_id: task_id,
        status: 'already_completed',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} is not in pending state and cannot be cancelled.`,
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
