import { Inject, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { Attribute, TaskGenerationReq, TaskGenerationRes } from './dto/Task_Generation.dto';
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

  unstructureHelper(input: any, jsonData: any, expression: string, sliceString : string | null = 'input'): any{
    try {
        const prop = sliceString !== null ? expression.slice(`${sliceString}.`.length): expression;
        const requirement = input[prop];
        return requirement;
      } catch (e) {
        return "gotError";
      }
  }
  async createUnstructuredTask (warehouseId: string, input: any, config_id: number): Promise<any> {
    const filePath = `src/config/data_config/${config_id}.json`; 
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      const Tasks: TaskReq[] = [];
      const taskArray = this.unstructureHelper(input, jsonData, jsonData['tasks'].source) ;
      for (const op of taskArray) {
        const map = jsonData['tasks']['map']
        console.log('map', map);
        console.log('op', op);

        const startLocation = this.unstructureHelper(op, jsonData, map.start_location.source,'op');
        console.log('startLocation', startLocation);
        const startLocationDimension =  this.unstructureHelper(startLocation, jsonData, map.start_location.location_dimension.source, null);
        console.log('startLocationDimension', startLocationDimension);
        const startLocationAttribute = ("location_attribute" in map.start_location) ? this.unstructureHelper(startLocation, jsonData, startLocation['location_attribute'], 'op') : null;

        const endLocation = this.unstructureHelper(op, jsonData, map.end_location.source, 'op');
        console.log('endLocation', endLocation);
        const endLocationDimension = this.unstructureHelper(endLocation, jsonData, map.end_location.location_dimension.source, null);
        const endLocationAttribute: Attribute = ("location_attribute" in map.end_location) ? this.unstructureHelper(endLocation, jsonData, endLocation['location_attribute'], 'op') : null;
        console.log('endLocationDimension', endLocationDimension);
        console.log('endLocationAttribute', endLocationAttribute);
        const cargoArray = this.unstructureHelper(op, jsonData, map['cargos'].source, 'op');
        const cargoMap = map['cargos']['map'];
        const cargoDimension = cargoMap['cargo_dimension'];
        const cargos: any[] = [];
        console.log('cargoArray', cargoArray);
        console.log('cargoMap', cargoMap);
        console.log('cargoDimension', cargoDimension);
        for (const cargo of cargoArray) {
          const cargo_code = this.unstructureHelper(cargo, jsonData, cargoMap['cargo_code'], 'item');
          const cargoDimensionData = this.unstructureHelper(cargo, jsonData, cargoDimension.source, 'item');
          const cargoDimensionObj = {
            length: this.unstructureHelper(cargoDimensionData, jsonData, cargoDimension['length'], null),
            width: this.unstructureHelper(cargoDimensionData, jsonData, cargoDimension['width'], null),
            height: this.unstructureHelper(cargoDimensionData, jsonData, cargoDimension['height'], null),
          };
          const cargoAttributes =  null;
          const cargoWeight = this.unstructureHelper(cargo, jsonData, cargoMap['cargo_weight'], 'item');

          console.log('Cargo dimension Object', cargoDimensionObj);
          cargos.push({
            cargo_code: cargo_code,
            cargo_type: ("cargo_type" in cargoMap) ? this.unstructureHelper(cargo, jsonData, cargoMap['cargo_type'], 'item') : null,
            cargo_dimension: cargoDimensionObj,
            cargo_attributes: cargoAttributes,
            cargo_weight: cargoWeight,
          });
        }


        const task: TaskReq = {
          task_id: this.unstructureHelper(op, jsonData, jsonData['tasks']['map']['task_id'], 'op'),
          task_pallet_id: ("task_pallet_id" in map) ?this.unstructureHelper(op, jsonData, map['task_pallet_id'], 'op') : null,
          task_type: ("task_type" in map) ? this.unstructureHelper(op, jsonData, map['task_type'], 'op'): 'Crossdock',
          task_dependency: ("task_dependency" in map) ? this.unstructureHelper(op, jsonData, map['task_dependency'], 'op') : null,
          start_location: {
            location_id: this.unstructureHelper(startLocation, jsonData, startLocation['location_id'], null),
            location_zone: ("location_zone" in startLocation) ? this.unstructureHelper(startLocation, jsonData,startLocation['location_zone'], null): null,
            location_action: this.unstructureHelper(startLocation, jsonData,startLocation['location_action'], null),
            location_dimension: {
              length: this.unstructureHelper(startLocationDimension, jsonData,map.start_location.location_dimension.length, null),
              width: this.unstructureHelper(startLocationDimension, jsonData, map.start_location.location_dimension.width , null),
              height: this.unstructureHelper(startLocationDimension, jsonData,map.start_location.location_dimension.height , null),
            },
            location_attribute: startLocationAttribute ? {
              attribute_name: this.unstructureHelper(startLocationAttribute, jsonData,startLocationAttribute['attribute_name'], null),
              attribute_value: this.unstructureHelper(startLocationAttribute, jsonData,startLocationAttribute['attribute_value'], null),
            } : {'attribute_name': null, 'attribute_value': null} ,
          },
          end_location: {
            location_id: this.unstructureHelper(endLocation, jsonData, endLocation['location_id'], null),
            location_zone: ("location_zone" in endLocation) ? this.unstructureHelper(endLocation, jsonData,endLocation['location_zone'], null): null,
            location_action: this.unstructureHelper(endLocation, jsonData,endLocation['location_action'], null),
            location_dimension: {
              length: this.unstructureHelper(endLocationDimension, jsonData,map.end_location.location_dimension.length, null),
              width: this.unstructureHelper(endLocationDimension, jsonData, map.end_location.location_dimension.width , null),
              height: this.unstructureHelper(endLocationDimension, jsonData,map.end_location.location_dimension.height , null),
            },
            location_attribute: endLocationAttribute ? {
              attribute_name: this.unstructureHelper(endLocationAttribute, jsonData,endLocationAttribute['attribute_name'], null),
              attribute_value: this.unstructureHelper(endLocationAttribute, jsonData,endLocationAttribute['attribute_value'], null),
            }: {'attribute_name': null, 'attribute_value': null} ,
          },  
          cargos: cargos,
          wait_time: {
            wait_type: 'null',
            start_location_wait_time: 0,
            end_location_wait_time: 0,
          }

        };

        Tasks.push(task);

      }

      const TaskReq: TaskGenerationReq = {
        batch_job_id: this.unstructureHelper(input, jsonData, jsonData['batch_job_id']),
        batch_priority: ('batch_priority' in jsonData) ? this.unstructureHelper(input, jsonData, jsonData['batch_priority']): 5,
        batch_type: ('batch_type' in jsonData) ? this.unstructureHelper(input, jsonData, jsonData['batch_type']) : 'Discrete',
        batch_frequency: ('batch_frequency' in jsonData) ? this.unstructureHelper(input, jsonData, jsonData['batch_frequency']) : undefined,
        tasks: Tasks,
      }
      console.log('TaskReq', TaskReq);
      const response = await this.createTask(warehouseId, TaskReq);
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
