import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import {
  batch_type,
  Location as CreateLocation,
  TaskGenerationReq,
  TaskGenerationRes,
  Wait,
  WaitCondition,
  WaitType,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes, Location as updateLocation } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import { Any, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { Location } from './entities/locations.entity';
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';
import * as fs from 'fs/promises';
import axios from 'axios';
import { DEFAULT_FACTORY_CLASS_METHOD_KEY } from '@nestjs/common/module-utils/constants';
import { create } from 'domain';
import { Validator } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class RobotJobService {
  constructor(
    @InjectRepository(BatchJob)
    private readonly BatchJobRepository: Repository<BatchJob>,

    @InjectRepository(Task)
    private readonly TaskRepository: Repository<Task>,

    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,

    private readonly validator: Validator = new Validator(),
    
  ) {}

  async updateLocation(location: Location | updateLocation | CreateLocation  , update:boolean){
    if (location && location.location_id) {
      const loc= await this.LocationRepository.findOne({
        where: { location_id: location.location_id },
      });
      if (!loc) {
        throw new Error(
          `Location with id ${location.location_id} does not exist`,
        );
      }
      await this.LocationRepository.update(
        { location_id: location.location_id },
        { isEmpty: update},
      );
    } else {
      throw new Error("Location or location ID doesn't exists.");
    }
  }
  async checkLocation(location: Location | updateLocation | CreateLocation, valueToCheck: boolean) {
    if (location && location.location_id) {
      const loc = await this.LocationRepository.findOne({
        where: { location_id: location.location_id },
      });
      if (!loc) {
        throw new Error(
          `Location with id ${location.location_id} does not exist`,
        );
      }
      if  (loc.isEmpty !== valueToCheck) {
        throw new Error(
          `Location with id ${location.location_id} is not in the expected state. Expected: ${valueToCheck}, Actual: ${loc.isEmpty}`,
        );
      }
    } else {
      throw new Error("Location or location ID doesn't exists.");
    }
  }

  async createTask(
    warehouseId: string,
    createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    const Tasks: any[] = createRobotJobDto.tasks;

    try {
      // for (const task of Tasks) {
      //   await this.checkLocation(task.start_location,true);
      //   await this.checkLocation(task.end_location,true);
        
      //   await this.updateLocation(task.start_location, false);
      //   await this.updateLocation(task.end_location, false);
      // }

      // check if batch_job_id exists
      if (!createRobotJobDto.batch_job_id) {
        createRobotJobDto.batch_job_id = `batch-${Date.now()}`;
      }

      if (createRobotJobDto.tasks.length === 0) {
        throw new Error(
          `No tasks provided for batch job in warehouse ${warehouseId}. At least one task is required.`,
        );
      }

      const batch_job_id = createRobotJobDto.batch_job_id;
      const uniqueness = await this.BatchJobRepository.findOne({
        where: { batch_job_id: batch_job_id, warehouse_id: warehouseId },
      });
      if (uniqueness) {
        throw new Error(
          `Batch job with id ${batch_job_id} already exists in warehouse ${warehouseId}. Combination of Batch Job ID and Warehouse ID must be unique.`,
        );
      }
      if (createRobotJobDto.batch_type == batch_type.Continuous && !createRobotJobDto.batch_frequency) {
        throw new Error(
          `Batch frequency is required for continuous batch type in warehouse ${warehouseId}.`,
        );
      }
      const newBatchJob: BatchJob = this.BatchJobRepository.create({
        batch_job_id: createRobotJobDto.batch_job_id,
        warehouse_id: warehouseId,
        batch_priority: createRobotJobDto.batch_priority,
        batch_type: createRobotJobDto.batch_type,
        batch_frequency: createRobotJobDto.batch_frequency,
        status: 'pending',
      });

      await this.BatchJobRepository.save(newBatchJob);
      for (const task of Tasks) {
        try{
          if (task.wait && task.wait.wait_type == WaitType.Conditional){
            const wait = task.wait;
            if (!wait.wait_condition){
              throw new Error(`Wait condition is required for conditional wait type in task ${task.task_id}.`);
            }
            if (wait.wait_condition == WaitCondition.Time && (!wait.start_location_wait_time && !wait.end_location_wait_time)) {
              throw new Error(`Start and end location wait times are required for time-based wait condition in task ${task.task_id}.`);
            }
            if (wait.wait_condition == WaitCondition.LocationAvailable && (!wait.start_location_available_wait && !wait.end_location_available_wait)) {
              throw new Error(`Start and end location available wait times are required for location available wait condition in task ${task.task_id}.`);
            }
          }
          const newTask = this.TaskRepository.create({
            task_id: task.task_id,
            task_type: task.task_type,
            task_dependency: task.task_dependency,
            start_location: task.start_location,
            end_location: task.end_location,
            wait_time: task.wait_time,
            cargos: task.cargos,
            batch_job: newBatchJob,
            status: 'pending'
          });
          this.TaskRepository.save(newTask);
        }
        catch (error) {
          console.error('Error creating task:', error);
        }
        finally{
          continue;
        } 
      }
      return {
        batch_id: createRobotJobDto.batch_job_id,
        status: 'success',
      };
    } catch (error) {
      // if (Tasks && Array.isArray(Tasks)) {
      //   for (const task of Tasks) {
      //     if (task.start_location && task.start_location.location_id) {
      //       await this.LocationRepository.update(
      //         { location_id: task.start_location.location_id },
      //         { isEmpty: true },
      //       );
      //     }
      //     if (task.end_location && task.end_location.location_id) {
      //       await this.LocationRepository.update(
      //         { location_id: task.end_location.location_id },
      //         { isEmpty: true },
      //       );
      //     }
      //   }
      // }
      console.error('Error creating task:', error);
      return {
        batch_id: createRobotJobDto.batch_job_id,
        status: `error: ${error.message}`,
      };
    }
  }

  unstructureHelper(
    input: any,
    expression: string,
  ): [boolean, any, string | null] {
    try {
      if (expression === 'null' || !expression) {
        return [true, null, null];
      }
      const keys = expression.split('.').slice(1);
      let current = input;
      for (const key of keys) {
        if (current === null || current === undefined) {
          return [false, null, key];
        }
        if (typeof current !== 'object') return [false, null, key];
        if (key.includes('[') && key.includes(']') && !(key in current)) {
          const match = key.match(/^(\w+)\[(\d+)\]$/);
          if (match) {
            const baseKey = match[1];
            const index = parseInt(match[2], 10);
            if (
              Array.isArray(current[baseKey]) &&
              current[baseKey][index] !== undefined
            ) {
              current = current[baseKey][index];
            } else {
              return [false, null, key];
            }
          } else {
            return [false, null, key];
          }
        } else {
          if (!(key in current)) {
            return [false, null, key];
          }
          current = current[key];
        }
      }
      return [true, current, null];
    } catch (e) {
      return [false, null, expression];
    }
  }

  async _genericTaskTransformer(
    mapping: any,
    input: any,
  ): Promise<any> {
    if (!input || !mapping) {
      return null;
    }

    if (mapping.path) {
      const [success, value] = this.unstructureHelper(input, mapping.path);
      if (!success) return null;

      switch (mapping.object_type) {
        case 'string':
          return String(value);
        case 'number':
          return Number(value);
        case 'boolean':
          return Boolean(value);
        case 'null':
          return null;
        default:
          return value;
      }
    }

    if (mapping.object_type === 'object') {
      const transformedObject: { [key: string]: any } = {};
      for (const key in mapping) {
        if (['object_type', 'source', 'map', 'source_type'].includes(key)) {
          continue;
        }
        transformedObject[key] = await this._genericTaskTransformer(
          mapping[key],
          input,
        );
      }
      return transformedObject;
    }

    if (mapping.object_type === 'array') {
      const transformedArray: any[] = [];
      const itemMap = mapping.map;

      const [sourceSuccess, sourceData] = this.unstructureHelper(
        input,
        mapping.source,
      );

      if (!sourceSuccess || !sourceData) {
        return [];
      }

      const sourceArray = Array.isArray(sourceData) ? sourceData : [sourceData];

      for (const item of sourceArray) {
        const transformedItem = await this._genericTaskTransformer(
          itemMap,
          item,
        );
        transformedArray.push(transformedItem);
      }
      return transformedArray;
    }

    return null;
  }

  async createUnstructuredTask(
    warehouseId: string,
    configFolderName: string,
    operationType: string,
    input: any,
  ): Promise<TaskGenerationRes> {
    const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const taskRequest = await this._genericTaskTransformer(jsonData, input);

      const structuredDto = plainToInstance(TaskGenerationReq, taskRequest);
      const validationErrors = await this.validator.validate(structuredDto);
  
      if (validationErrors.length === 0) {
        const result = await this.createTask(warehouseId, structuredDto);
        if (result.status !== 'success') {
          throw new BadRequestException(result.status);
        }
        return result;
      }
      else{
        throw new BadRequestException(
          'Transformer failed to produce a valid task structure.',
        );
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: `error: ${error.message}`,
          batch_id: '',
        };
      }
      return {
        status: `error: ${error.message}`,
        batch_id: '',
      };
    }
  }

  async updateTask(
    warehouse_id: string,
    updateRobotJobDto: TaskUpdateReq,
  ): Promise<TaskUpdateRes> {
    const tasks: UpdateTask[] = updateRobotJobDto.updates;
    for (const task of tasks) {
      try{
          if (task.wait_time && task.wait_time.wait_type == WaitType.Conditional){
          const wait = task.wait_time;
          if (!wait.wait_condition){
            throw new Error(`Wait condition is required for conditional wait type in task ${task.task_id}.`);
          }
          if (wait.wait_condition == WaitCondition.Time && (!wait.start_location_wait_time && !wait.end_location_wait_time)) {
            throw new Error(`Start and end location wait times are required for time-based wait condition in task ${task.task_id}.`);
          }
          if (wait.wait_condition == WaitCondition.LocationAvailable && (!wait.start_location_available_wait && !wait.end_location_available_wait)) {
            throw new Error(`Start and end location available wait times are required for location available wait condition in task ${task.task_id}.`);
          }
        }
        const taskRepo: Task | null = await this.TaskRepository.findOne({
          where: {
            task_id: task.task_id,
            batch_job: {
              batch_job_id: updateRobotJobDto.batch_job_id,
              warehouse_id: warehouse_id,
            },
          },
          relations: ['batch_job'],
        });
        if (!taskRepo) {
          console.log(
            `Task with ID ${task.task_id} not found in warehouse ${warehouse_id}.`,
          );
          continue;
        }
        taskRepo.task_dependency =
          task.task_dependency ?? taskRepo.task_dependency;

        // await this.updateLocation(taskRepo.start_location, true);
        // await this.updateLocation(taskRepo.end_location, true);
        taskRepo.start_location.location_id = task.start_location.location_id;
        taskRepo.start_location.location_dimension =
          task.start_location.location_dimension;

        taskRepo.end_location.location_id = task.end_location.location_id;
        taskRepo.end_location.location_dimension =
          task.end_location.location_dimension;
        
        // await this.updateLocation(taskRepo.start_location, false);
        // await this.updateLocation(taskRepo.end_location, false);

        taskRepo.wait_time = task.wait_time ? task.wait_time : taskRepo.wait_time;

        for (const cargo of task.cargos) {
          const existingCargo = taskRepo.cargos.find(
            (c) => c.cargo_code === cargo.cargo_code,
          );
          if (existingCargo) {
            existingCargo.cargo_dimension = cargo.cargo_dimension;
            existingCargo.cargo_weight =
              cargo.cargo_weight ?? existingCargo.cargo_weight;
          }
        }
        await this.TaskRepository.save(taskRepo);
      }
      catch (error) {
        console.error('Error updating task:', error);
      }
      finally{
        continue;
      }
      
    }

    if (tasks.length === 0) {
      return {
        batch_id: '',
        status: 'no_updates',
        updated_at: new Date().toISOString(),
        message: 'No tasks to update.',
      };
    }

    return {
      batch_id: updateRobotJobDto.batch_job_id,
      status: 'success',
      updated_at: new Date().toISOString(),
      message: 'Tasks updated successfully',
    };
  }

  async updateUnstructuredTask(
    warehouseId: string,
    configFolderName: string,
    operationType: string,
    input: any,
  ): Promise<TaskUpdateRes> {
    const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const updateRequest = await this._genericTaskTransformer(jsonData, input);

      const structuredDto = plainToInstance(TaskUpdateReq, updateRequest);
      const validationErrors = await this.validator.validate(structuredDto);
  
      if (validationErrors.length === 0) {
        const result = await this.updateTask(warehouseId, structuredDto);
        if (result.status !== 'success') {
          throw new BadRequestException(result.status);
        }
        return result;
      }
      else{
        throw new BadRequestException(
          'Transformer failed to produce a valid task structure.',
        );
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          batch_id: '',
          updated_at: new Date().toISOString(),
          message: `error: Configuration file '${operationType}.json' not found.`,
          status: `error`,
        };
      }
      return {
        batch_id: '',
        updated_at: new Date().toISOString(),
        message: `error: Failed to process unstructured task update: ${error.message}`,
        status: `error`,
      };

    }
  }

  async cancelTask(
    warehouse_id: string,
    updateRobotJobDto: TaskCancelReq | BatchCancelReq,
  ): Promise<TaskCancelRes | BatchCancelRes> {
    if (
      'batch_job_id' in updateRobotJobDto &&
      !('task_id' in updateRobotJobDto)
    ) {
      const batchJob = await this.BatchJobRepository.findOne({
        where: {
          batch_job_id: updateRobotJobDto.batch_job_id,
          warehouse_id: warehouse_id,
        },
      });
      if (!batchJob) {
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'success',
          cancelled_at: new Date().toISOString(),
          message: `Batch job with ID ${updateRobotJobDto.batch_job_id} not found in warehouse ${warehouse_id}.`,
        };
      }
      const tasks = await this.TaskRepository.find({
        where: { batch_job: { batch_job_id: updateRobotJobDto.batch_job_id } },
      });

      if (tasks.length === 0) {
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'success',
          cancelled_at: new Date().toISOString(),
          message: `No tasks found for batch job with ID ${updateRobotJobDto.batch_job_id}.`,
        };
      }
      if (batchJob.status !== 'pending') {
        return {
          task_id: updateRobotJobDto.batch_job_id,
          status: 'success',
          cancelled_at: new Date().toISOString(),
          message: `Batch job with ID ${updateRobotJobDto.batch_job_id} is not in pending state and cannot be cancelled.`,
        };
      }
      for (const task of tasks) {
        if (task.status !== 'pending') {
          continue;
        }
        this.updateLocation(task.start_location, true);
        this.updateLocation(task.end_location, true);
        await this.TaskRepository.remove(task);
      }
      await this.BatchJobRepository.remove(batchJob);
      return {
        task_id: tasks[0].task_id,
        status: 'success',
        cancelled_at: new Date().toISOString(),
        message: `Batch job with ID ${updateRobotJobDto.batch_job_id} and its tasks have been cancelled.`,
      };
    }
    const task_id = (updateRobotJobDto as TaskCancelReq).task_id;
    const taskRepo: Task | null = await this.TaskRepository.findOne({
      where: {
        task_id: task_id,
        batch_job: { warehouse_id: warehouse_id },
      },
    });
    if (!taskRepo) {
      return {
        task_id: task_id,
        status: 'success',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} not found in warehouse ${warehouse_id}.`,
      };
    }
    if (taskRepo.status !== 'pending') {
      return {
        task_id: task_id,
        status: 'success',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} is not in pending state and cannot be cancelled.`,
      };
    }
    this.updateLocation(taskRepo.start_location, true);
    this.updateLocation(taskRepo.end_location, true);
    await this.TaskRepository.remove(taskRepo);
    return {
      task_id: task_id,
      status: 'success',
      cancelled_at: new Date().toISOString(),
      message: `Task with ID ${task_id} has been cancelled.`,
    };
  }

  async cancelUnstructuredTask(
    warehouseId: string,
    configFolderName: string,
    operationType: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const cancelRequest = await this._genericTaskTransformer(jsonData, input);

      if (
        !cancelRequest ||
        (!cancelRequest.batch_job_id && !cancelRequest.task_id)
      ) {
        return {
          status: 'error',
          message:
            'Transformation failed. Input must produce a batch_job_id or a task_id.',
        };
      }

      return await this.cancelTask(
        warehouseId,
        cancelRequest as TaskCancelReq | BatchCancelReq,
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: 'error',
          message: `Configuration file '${operationType}.json' not found.`,
        };
      }
      return {
        status: 'error',
        message: `Failed to process unstructured task cancellation: ${error.message}`,
      };
    }
  }

  async getEmptyLocations(
    warehouseId: string,
    getLocationReq: GetLocationReq,
    config_name: string,
  ): Promise<GetLocationRes> {
    const filePath = `src/config_mapping/${config_name}/get_empty_location.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const mapping = JSON.parse(fileContent);

      let apiEndpoint = mapping.endpoint.url;

      const path_params = mapping.request.path_params;
      if (!path_params) {
        throw new Error('Path parameters are not defined in the mapping.');
      }
      for (const path_param in path_params) {
        console.log(
          `Path Param: ${path_param}, Value: ${path_params[path_param]}`,
        );
        apiEndpoint = apiEndpoint.replace(
          `:${path_param}`,
          encodeURIComponent(
            this.unstructureHelper(
              getLocationReq,
              path_params[path_param],
            )[1] || '',
          ),
        );
      }

      const query_params = mapping.request.query_params;
      if (!query_params) {
        throw new Error('Query parameters are not defined in the mapping.');
      }
      for (const query_param in query_params) {
        if (query_params[query_param] === 'null') {
          continue; // Skip if the query parameter value is "null"
        }
        apiEndpoint += `?${query_param}=${encodeURIComponent(
          query_params[query_param],
        )}`;
      }

      const payload: any = await this._genericTaskTransformer(
        mapping.request.body,
        getLocationReq,
      );
      console.log('Transformed Payload:', payload);
      const response = await axios.post(apiEndpoint, getLocationReq, {
        headers: {
          'Content-Type': mapping.endpoint.headers['Content-Type'],
        },
        data: getLocationReq,
      });
      console.log('API Response:', response.data);
      const responseData = response.data;
      const TransformedResponse = await this._genericTaskTransformer(
        mapping.response.body,
        responseData,
      );
      console.log(
        'Transformed Response:',
        JSON.stringify(TransformedResponse, null, 2),
      );
      return TransformedResponse as GetLocationRes;
    } catch (error) {
      return {
        zone_id: '',
        available_location_types: [],
      };
    }
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
