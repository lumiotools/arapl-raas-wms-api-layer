import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
} from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import {
  batch_type,
  Location as CreateLocation,
  LocationAction,
  TaskGenerationReq,
  TaskGenerationRes,
  Wait,
  WaitCondition,
  WaitType,
} from './dto/Task_Generation.dto';
import {
  TaskUpdateReq,
  TaskUpdateRes,
  Location as updateLocation,
} from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { Any, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { CancelReq, BatchCancelRes, TaskCancelRes } from './dto/Cancel.dto';
import { Location } from './entities/locations.entity';
import {
  GetLocationReq,
  GetLocationRes,
  LocationType,
} from './dto/GetLocation.dto';
import * as fs from 'fs/promises';
import axios from 'axios';
import { DEFAULT_FACTORY_CLASS_METHOD_KEY } from '@nestjs/common/module-utils/constants';

import { create } from 'domain';
import { Validator } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Task as TaskEntity } from './entities/task.entity';
import { Warehouse } from './entities/warehouse.entity';
import { UpdateWebhookReq, UpdateWebhookRes } from './dto/UpdateWebhook.dto';
import {
  UpdateLocationTrackingReq,
  UpdateLocationTrackingRes,
} from './dto/UpdateLocationTracking.dto';
import { createTask } from 'src/modules/FMS_Integration/services/create_task';
import { get_tasks } from '../FMS_Integration/services/get_task';
import { cancelBatch, cancelBatchTask } from '../FMS_Integration/services/cancel';
import { io, Socket } from 'socket.io-client';
import { get_location } from '../FMS_Integration/services/get_location';

@Injectable()
export class RobotJobService {
  private fms_socket: Socket;
  private isFilterSet = false;

  onModuleInit() {
    this.fms_socket = io('ws://api.araplraas.com');

    this.fms_socket.on('connect', () => {
      console.log('Connected to FMS socket server');
      this.setupTaskFilters(); // Set filters on connect
    });

    this.fms_socket.on('reconnect', () => {
      console.log('Reconnected to FMS socket server');
      this.setupTaskFilters(); // Re-establish filters on reconnection
    });

    this.fms_socket.on('message', (data) => {
      console.log('Received from FMS server:', data);
    });

    this.fms_socket.on('taskListFilteredUpdate', (data: any) => {
      console.log('Received task list filtered update:', data);
      this.processTaskUpdate(data);
    });

    this.fms_socket.on('disconnect', () => {
      this.isFilterSet = false;
    });
  }

  private setupTaskFilters() {
    if (!this.isFilterSet) {
      this.fms_socket.emit('message', {
        "event": "setTaskListFilters",
        "data": {
          "limit": 10,
          "filter": { "status": "task_in_progress" },
          "sort": "latest",
          "start_date": "2025-08-01",
          "end_date": "2025-08-08"
        }
      });
      this.isFilterSet = true;
      console.log('Task filters set');
    }
  }

  // Method to update filters when needed
  updateTaskFilters(newFilters: any) {
    this.fms_socket.emit('message', {
      "event": "setTaskListFilters",
      "data": newFilters
    });
    console.log('Task filters updated:', newFilters);
  }

  private processTaskUpdate(data: any) {
    // Your business logic here
    // This will be called automatically when tasks change
  }

  onModuleDestroy() {
    this.fms_socket?.disconnect();
  }

  constructor(
    @InjectRepository(BatchJob)
    private readonly BatchJobRepository: Repository<BatchJob>,

    @InjectRepository(Task)
    private readonly TaskRepository: Repository<Task>,

    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,

    @InjectRepository(Warehouse)
    private readonly WarehouseRepository: Repository<Warehouse>,

    private readonly validator: Validator = new Validator(),
  ) {}

  async getTasksByBatchId(
    warehouseId: string,
    batchId: string,
  ): Promise<TaskEntity[]> {
    return get_tasks({
      warehouse_id: warehouseId,
      batch_job_id: batchId,
    });
  }

  async updateLocation(
    location: Location | updateLocation | CreateLocation,
    update: boolean,
  ) {
    if (location && location.location_id) {
      const loc = await this.LocationRepository.findOne({
        where: { location_id: location.location_id },
      });
      if (!loc) {
        throw new Error(
          `Location with id ${location.location_id} does not exist`,
        );
      }
      await this.LocationRepository.update(
        { location_id: location.location_id },
        { isEmpty: update },
      );
    } else {
      throw new Error("Location or location ID doesn't exists.");
    }
  }
  async checkLocation(
    location: Location | updateLocation | CreateLocation,
    valueToCheck: boolean,
  ) {
    if (location && location.location_id) {
      const loc = await this.LocationRepository.findOne({
        where: { location_id: location.location_id },
      });
      if (!loc) {
        throw new Error(
          `Location with id ${location.location_id} does not exist`,
        );
      }
      if (loc.isEmpty !== valueToCheck) {
        throw new Error(
          `Location with id ${location.location_id} is not in the expected state. Expected: ${valueToCheck}, Actual: ${loc.isEmpty}`,
        );
      }
    } else {
      throw new Error("Location or location ID doesn't exists.");
    }
  }

  // async createTask(
  //   warehouseId: string,
  //   createRobotJobDto: TaskGenerationReq,
  // ): Promise<TaskGenerationRes> {
  //   const Tasks: any[] = createRobotJobDto.tasks;

  //   try {
  //     // for (const task of Tasks) {
  //     //   await this.checkLocation(task.start_location,true);
  //     //   await this.checkLocation(task.end_location,true);

  //     //   await this.updateLocation(task.start_location, false);
  //     //   await this.updateLocation(task.end_location, false);
  //     // }

  //     // check if batch_job_id exists
  //     if (!createRobotJobDto.batch_job_id) {
  //       const now = new Date();
  //       const pad = (n: number) => n.toString().padStart(2, '0');
  //       const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${now.getMilliseconds()}`;
  //       createRobotJobDto.batch_job_id = `Batch-${timestamp}`;
  //     }

  //     if (createRobotJobDto.tasks.length === 0) {
  //       throw new Error(
  //         `No tasks provided for batch job in warehouse ${warehouseId}. At least one task is required.`,
  //       );
  //     }

  //     const batch_job_id = createRobotJobDto.batch_job_id;
  //     const uniqueness = await this.BatchJobRepository.findOne({
  //       where: { batch_job_id: batch_job_id, warehouse_id: warehouseId },
  //     });
  //     if (uniqueness) {
  //       throw new Error(
  //         `Batch job with id ${batch_job_id} already exists in warehouse ${warehouseId}. Combination of Batch Job ID and Warehouse ID must be unique.`,
  //       );
  //     }
  //     if (createRobotJobDto.batch_type == batch_type.Continuous && !createRobotJobDto.batch_frequency) {
  //       throw new Error(
  //         `Batch frequency is required for continuous batch type in warehouse ${warehouseId}.`,
  //       );
  //     }
  //     const newBatchJob: BatchJob = this.BatchJobRepository.create({
  //       batch_job_id: createRobotJobDto.batch_job_id,
  //       warehouse_id: warehouseId,
  //       batch_priority: createRobotJobDto.batch_priority,
  //       batch_type: createRobotJobDto.batch_type,
  //       batch_frequency: createRobotJobDto.batch_frequency,
  //       status: 'pending',
  //     });

  //     await this.BatchJobRepository.save(newBatchJob);
  //     for (const task of Tasks) {
  //       try{
  //         if (task.wait && task.wait.wait_type == WaitType.Conditional){
  //           const wait = task.wait;
  //           if (!wait.wait_condition){
  //             throw new Error(`Wait condition is required for conditional wait type in task ${task.task_id}.`);
  //           }
  //           if (wait.wait_condition == WaitCondition.Time && (wait.start_location_wait_time==0 && wait.end_location_wait_time==0)) {
  //             throw new Error(`Start and end location wait times are required for time-based wait condition in task ${task.task_id}.`);
  //           }
  //           if (wait.wait_condition == WaitCondition.LocationAvailable && (!wait.start_location_available_wait && !wait.end_location_available_wait)) {
  //             throw new Error(`Start and end location available wait times are required for location available wait condition in task ${task.task_id}.`);
  //           }
  //         }
  //         const newTask = this.TaskRepository.create({
  //           task_id: task.task_id,
  //           task_type: task.task_type,
  //           task_dependency: task.task_dependency,
  //           start_location: task.start_location,
  //           end_location: task.end_location,
  //           wait_time: task.wait_time,
  //           cargos: task.cargos,
  //           batch_job: newBatchJob,
  //           status: 'pending',
  //         });
  //         this.TaskRepository.save(newTask);
  //       } catch (error) {
  //         console.error('Error creating task:', error);
  //       } finally {
  //         continue;
  //       }
  //     }
  //     return {
  //       batch_id: createRobotJobDto.batch_job_id,
  //       status: 'success',
  //     };
  //   } catch (error) {
  //     // if (Tasks && Array.isArray(Tasks)) {
  //     //   for (const task of Tasks) {
  //     //     if (task.start_location && task.start_location.location_id) {
  //     //       await this.LocationRepository.update(
  //     //         { location_id: task.start_location.location_id },
  //     //         { isEmpty: true },
  //     //       );
  //     //     }
  //     //     if (task.end_location && task.end_location.location_id) {
  //     //       await this.LocationRepository.update(
  //     //         { location_id: task.end_location.location_id },
  //     //         { isEmpty: true },
  //     //       );
  //     //     }
  //     //   }
  //     // }
  //     console.error('Error creating task:', error);
  //     return {
  //       batch_id: createRobotJobDto.batch_job_id || '',
  //       status: `error: ${error.message}`,
  //     };
  //   }
  // }

  async createTask(
    warehouseId: string,
    createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    const Tasks: any[] = createRobotJobDto.tasks;

    if (!createRobotJobDto.batch_job_id) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${now.getMilliseconds()}`;
      createRobotJobDto.batch_job_id = `Batch-${timestamp}`;
    }

    if (Tasks.length === 0) {
      throw new BadRequestException(
        `No tasks provided. At least one task is required.`,
      );
    }

    const batch_job_id = createRobotJobDto.batch_job_id;
    const uniqueness = await this.BatchJobRepository.findOne({
      where: { batch_job_id: batch_job_id, warehouse_id: warehouseId },
    });

    if (uniqueness) {
      throw new ConflictException(
        `Batch job with id ${batch_job_id} already exists in warehouse ${warehouseId}.`,
      );
    }

    if (
      createRobotJobDto.batch_type === batch_type.Continuous &&
      !createRobotJobDto.batch_frequency
    ) {
      throw new BadRequestException(
        `Batch frequency is required for continuous batch type.`,
      );
    }

    const newBatchJob = this.BatchJobRepository.create({
      batch_job_id,
      warehouse_id: warehouseId,
      batch_priority: createRobotJobDto.batch_priority,
      batch_type: createRobotJobDto.batch_type,
      batch_frequency: createRobotJobDto.batch_frequency,
      status: 'pending',
    });

    await this.BatchJobRepository.save(newBatchJob);

    for (const task of Tasks) {
      try {
        if (task.wait && task.wait.wait_type === WaitType.Conditional) {
          const wait = task.wait;
          if (!wait.wait_condition) {
            throw new BadRequestException(
              `Wait condition is required for conditional wait in task ${task.task_id}.`,
            );
          }

          if (
            wait.wait_condition === WaitCondition.Time &&
            wait.start_location_wait_time === 0 &&
            wait.end_location_wait_time === 0
          ) {
            throw new BadRequestException(
              `Wait times are required for time-based wait condition in task ${task.task_id}.`,
            );
          }

          if (
            wait.wait_condition === WaitCondition.LocationAvailable &&
            !wait.start_location_available_wait &&
            !wait.end_location_available_wait
          ) {
            throw new BadRequestException(
              `Location availability flags are required for location-based wait in task ${task.task_id}.`,
            );
          }
        }

        const newTask = this.TaskRepository.create({
          task_id: task.task_id,
          task_type: task.task_type,
          task_dependency: task.task_dependency,
          start_location: task.start_location,
          end_location: task.end_location,
          wait_time: task.wait_time,
          robot_id: task.robot_id,
          cargos: task.cargos,
          batch_job: newBatchJob,
          status: 'pending',
        });

        await this.TaskRepository.save(newTask);
      } catch (err) {
        console.error(`Task ${task.task_id} creation failed:`, err);
        // Optional: collect errors into array and return it at the end
      }
    }
    let fms_response ;
    try{
      fms_response = await createTask({
        warehouse_id: warehouseId,
        batch_job_id: createRobotJobDto.batch_job_id,
        batch_priority: createRobotJobDto.batch_priority,
        batch_type: createRobotJobDto.batch_type,
        batch_frequency: createRobotJobDto.batch_frequency,
        tasks: Tasks,
      });
    }catch(err){
      throw new BadRequestException('FMS task creation failed');
    }
    console.log(`fms response: ${JSON.stringify(fms_response)}`);
    if (fms_response) {
      return {
        batch_id: createRobotJobDto.batch_job_id,
        status: 'success',
      };
    }
    throw new BadRequestException('FMS task creation failed: ', fms_response.status);
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

  async _genericTaskTransformer(mapping: any, input: any): Promise<any> {
    if (!input || !mapping) {
      return null;
    }

    if (mapping.path) {
      const [success, value] = this.unstructureHelper(input, mapping.path);
      if (!success)
        return mapping.default === undefined ? null : mapping.default;

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
    config: any,
    input: any,
  ): Promise<TaskGenerationRes> {
    try {
      const taskRequest = await this._genericTaskTransformer(config, input);
      const structuredDto = plainToInstance(TaskGenerationReq, taskRequest);
      const validationErrors = await this.validator.validate(structuredDto);

      if (validationErrors.length > 0) {
        throw new BadRequestException(
          'Transformer failed to produce a valid task structure.',
        );
      }

      const result = await this.createTask(warehouseId, structuredDto);
      return result;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException(`Config not found`);
      }

      // Wrap any other exception into BadRequest (or rethrow if it's already an HttpException)
      if (error instanceof Error && !(error instanceof HttpException)) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  async updateTask(
    warehouse_id: string,
    updateRobotJobDto: TaskUpdateReq,
  ): Promise<TaskUpdateRes> {
    const warehouse = await this.WarehouseRepository.findOne({
      where: { warehouse_id: warehouse_id },
    });
    if (!warehouse) {
      throw new NotFoundException(
        `Warehouse with ID '${warehouse_id}' not found.`,
      );
    }
    const batchJob = await this.BatchJobRepository.findOne({
      where: {
        batch_job_id: updateRobotJobDto.batch_job_id,
        warehouse_id: warehouse_id,
      },
    });
    if (!batchJob) {
      throw new NotFoundException(
        `Batch job with ID '${updateRobotJobDto.batch_job_id}' not found in warehouse '${warehouse_id}'.`,
      );
    }
    const tasks: UpdateTask[] = updateRobotJobDto.updates;
    for (const task of tasks) {
      try {
        if (
          task.wait_time &&
          task.wait_time.wait_type == WaitType.Conditional
        ) {
          const wait = task.wait_time;
          if (!wait.wait_condition) {
            throw new Error(
              `Wait condition is required for conditional wait type in task ${task.task_id}.`,
            );
          }
          if (
            wait.wait_condition == WaitCondition.Time &&
            wait.start_location_wait_time == 0 &&
            wait.end_location_wait_time == 0
          ) {
            throw new Error(
              `Start and end location wait times are required for time-based wait condition in task ${task.task_id}.`,
            );
          }
          if (
            wait.wait_condition == WaitCondition.LocationAvailable &&
            !wait.start_location_available_wait &&
            !wait.end_location_available_wait
          ) {
            throw new Error(
              `Start and end location available wait times are required for location available wait condition in task ${task.task_id}.`,
            );
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

        taskRepo.wait_time = task.wait_time
          ? task.wait_time
          : taskRepo.wait_time;

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
      } catch (error) {
        // catch (error) {
        //   console.error('Error updating task:', error);
        // }
        console.error(`Error updating task ${task.task_id}:`, error);
        throw new BadRequestException(
          `Task ${task.task_id} update failed: ${error.message}`,
        );
      } finally {
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
    config: any,
    input: any,
  ): Promise<TaskUpdateRes> {
    try {
      const updateRequest = await this._genericTaskTransformer(config, input);

      const structuredDto = plainToInstance(TaskUpdateReq, updateRequest);
      const validationErrors = await this.validator.validate(structuredDto);

      if (validationErrors.length === 0) {
        const result = await this.updateTask(warehouseId, structuredDto);
        if (result.status !== 'success') {
          throw new BadRequestException(result.status);
        }
        return result;
      } else {
        throw new BadRequestException(
          'Transformer failed to produce a valid task structure.',
        );
      }
    } catch (error) {
      // if (error.code === 'ENOENT') {
      //   return {
      //     batch_id: '',
      //     updated_at: new Date().toISOString(),
      //     message: `error: Configuration file '${operationType}.json' not found.`,
      //     status: `error`,
      //   };
      // }
      if (error.code === 'ENOENT') {
        throw new NotFoundException({
          status: 'error',
          message: `Configuration not found`,
          updated_at: new Date().toISOString(),
          batch_id: '',
        });
      }
      throw new HttpException(
        {
          status: 'error',
          message: `Failed to process unstructured task update: ${error.message}`,
          updated_at: new Date().toISOString(),
          batch_id: '',
        },
        400,
      );
    }
  }

  // async cancelBatch(warehouse_id: string, batch_id: string, cancel_req: CancelReq){
  //   const batchJob = await this.BatchJobRepository.findOne({
  //     where: {
  //       batch_job_id: batch_id,
  //       warehouse_id: warehouse_id,
  //     },
  //   });

  //   if (!batchJob) {
  //     return {
  //       task_id: batch_id,
  //       status: 'success',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Batch job with ID ${batch_id} not found in warehouse ${warehouse_id}.`,
  //     };
  //   }

  //   if (batchJob.status !== 'pending') {
  //     return {
  //       task_id: batch_id,
  //       status: 'success',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Batch job with ID ${batch_id} is not in pending state and cannot be cancelled.`,
  //     };
  //   }

  //   await this.BatchJobRepository.remove(batchJob);

  //   return {
  //     task_id: batchJob.batch_job_id,
  //     status: 'success',
  //     cancelled_at: new Date().toISOString(),
  //     message: `Batch job with ID ${batchJob.batch_job_id} and its tasks have been cancelled.`,
  //   };
  // }
  async cancelBatch(
    warehouse_id: string,
    batch_id: string,
    cancel_req: CancelReq,
  ): Promise<BatchCancelRes> {
    const batchJob = await this.BatchJobRepository.findOne({
      where: {
        batch_job_id: batch_id,
        warehouse_id: warehouse_id,
      },
    });

    if (!batchJob) {
      throw new NotFoundException({
        // task_id: batch_id,
        status: 'error',
        cancelled_at: new Date().toISOString(),
        message: `Batch job '${batch_id}' not found in warehouse '${warehouse_id}'.`,
      });
    }

    if (batchJob.status !== 'pending') {
      throw new ConflictException({
        // task_id: batch_id,
        status: 'error',
        cancelled_at: new Date().toISOString(),
        message: `Batch job '${batch_id}' is not in 'pending' state and cannot be cancelled.`,
      });
    }
    let fms_response;
    try {
      fms_response = await cancelBatch({
        warehouse_id,
        batch_job_id: batch_id,
        cancel_req
      });
    } catch (error) {
      console.error('Error occurred while cancelling batch:', error);
      throw new BadRequestException('Failed to cancel batch in FMS');
    }

    if (!fms_response) {
      throw new BadRequestException('Failed to cancel batch in FMS');
    }

    await this.BatchJobRepository.remove(batchJob);

    return {
      batch_id: batchJob.batch_job_id,
      status: 'success',
      cancelled_at: new Date().toISOString(),
      message: `Batch job '${batchJob.batch_job_id}' and its tasks have been cancelled.`,
    };
  }

  // async cancelTask(
  //   warehouse_id: string,
  //   batch_id: string,
  //   task_id: string,
  //   cancel_req: CancelReq,
  // ): Promise<TaskCancelRes> {
  //   const taskRepo: Task | null = await this.TaskRepository.findOne({
  //     where: {
  //       task_id: task_id,
  //       batch_job: { warehouse_id: warehouse_id },
  //     },
  //   });

  //   if (!taskRepo) {
  //     return {
  //       task_id: task_id,
  //       status: 'success',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Task with ID ${task_id} not found in warehouse ${warehouse_id}.`,
  //     };
  //   }

  //   if (taskRepo.status !== 'pending') {
  //     return {
  //       task_id: task_id,
  //       status: 'success',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Task with ID ${task_id} is not in pending state and cannot be cancelled.`,
  //     };
  //   }
  //   await this.TaskRepository.remove(taskRepo);

  //   return {
  //     task_id: taskRepo.task_id,
  //     status: 'success',
  //     cancelled_at: new Date().toISOString(),
  //     message: `Task with ID ${taskRepo.task_id} has been cancelled.`,
  //   };
  // }
  async cancelTask(
    warehouse_id: string,
    batch_id: string,
    task_id: string,
    cancel_req: CancelReq,
  ): Promise<TaskCancelRes> {
    const taskRepo: Task | null = await this.TaskRepository.findOne({
      where: {
        task_id: task_id,
        batch_job: { batch_job_id: batch_id },
      },
      relations: ['batch_job'],
    });

    if (!taskRepo) {
      throw new NotFoundException({
        status: 'error',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID '${task_id}' not found in warehouse '${batch_id}'.`,
      });
    }

    if (taskRepo.status !== 'pending') {
      throw new ConflictException({
        status: 'error',
        cancelled_at: new Date().toISOString(),
        message: `Task '${task_id}' is not in 'pending' state and cannot be cancelled.`,
      });
    }
    let fms_response;
    try{
      fms_response = await cancelBatchTask({
        warehouse_id,
        batch_job_id: batch_id,
        task_id: task_id,
        cancel_req
      });
    } catch (error) {
      console.error('Error occurred while cancelling task:', error);
      throw new BadRequestException('Failed to cancel task in FMS');
    }
    if (!fms_response) {
      throw new BadRequestException('Failed to cancel task in FMS');
    }

    await this.TaskRepository.remove(taskRepo);

    return {
      task_id: taskRepo.task_id,
      status: 'success',
      cancelled_at: new Date().toISOString(),
      message: `Task '${taskRepo.task_id}' has been cancelled.`,
    };
  }

  // async cancelUnstructuredBatch(
  //   warehouseId: string,
  //   batchId: string,
  //   configFolderName: string,
  //   operationType: string,
  //   input: any,
  // ): Promise<BatchCancelRes> {
  //   const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
  //   try {
  //     const fileContent = await fs.readFile(filePath, 'utf-8');
  //     const jsonData = JSON.parse(fileContent);

  //     const cancelRequest = await this._genericTaskTransformer(jsonData, input);

  //     const structuredDto = plainToInstance(CancelReq, cancelRequest);
  //     const validationErrors = await this.validator.validate(structuredDto);
  //     if (validationErrors.length > 0) {
  //       throw new BadRequestException(
  //         'Transformer failed to produce a valid cancel request structure.',
  //       );
  //     }

  //     return await this.cancelBatch(
  //       warehouseId,
  //       batchId,
  //       structuredDto,
  //     );
  //   } catch (error) {
  //     if (error.code === 'ENOENT') {
  //       return {
  //         task_id: '',
  //         status: 'error',
  //         cancelled_at: new Date().toISOString(),
  //         message: `Configuration file '${operationType}.json' not found.`,
  //       };
  //     }
  //     return {
  //       task_id: '',
  //       status: 'error',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Failed to process unstructured batch cancellation: ${error.message}`,
  //     };
  //   }
  // }

  async cancelUnstructuredBatch(
    warehouseId: string,
    batchId: string,
    config: any,
    input: any,
  ): Promise<BatchCancelRes> {
    try {
      const cancelRequest = await this._genericTaskTransformer(config, input);

      const structuredDto = plainToInstance(CancelReq, cancelRequest);
      const validationErrors = await this.validator.validate(structuredDto);
      if (validationErrors.length > 0) {
        throw new BadRequestException({
          task_id: batchId,
          status: 'error',
          cancelled_at: new Date().toISOString(),
          message:
            'Transformer failed to produce a valid cancel request structure.',
        });
      }

      return await this.cancelBatch(warehouseId, batchId, structuredDto);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException({
          task_id: '',
          status: 'error',
          cancelled_at: new Date().toISOString(),
          message: `Configuration not found`,
        });
      }

      throw new BadRequestException({
        task_id: '',
        status: 'error',
        cancelled_at: new Date().toISOString(),
        message: `Failed to process unstructured batch cancellation: ${error.message}`,
      });
    }
  }

  // async cancelUnstructuredTask(
  //   warehouseId: string,
  //   batchId: string,
  //   taskId: string,
  //   configFolderName: string,
  //   operationType: string,
  //   input: any,
  // ): Promise<TaskCancelRes> {
  //   const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
  //   try {
  //     const fileContent = await fs.readFile(filePath, 'utf-8');
  //     const jsonData = JSON.parse(fileContent);

  //     const cancelRequest = await this._genericTaskTransformer(jsonData, input);

  //     const structuredDto = plainToInstance(CancelReq, cancelRequest);
  //     const validationErrors = await this.validator.validate(structuredDto);
  //     if (validationErrors.length > 0) {
  //       throw new BadRequestException(
  //         'Transformer failed to produce a valid cancel request structure.',
  //       );
  //     }

  //     return await this.cancelTask(
  //       warehouseId,
  //       batchId,
  //       taskId,
  //       structuredDto
  //     );
  //   } catch (error) {
  //     if (error.code === 'ENOENT') {
  //       return {
  //         task_id: '',
  //         status: 'error',
  //         cancelled_at: new Date().toISOString(),
  //         message: `Configuration file '${operationType}.json' not found.`,
  //       };
  //     }
  //     return {
  //       task_id: '',
  //       status: 'error',
  //       cancelled_at: new Date().toISOString(),
  //       message: `Failed to process unstructured task cancellation: ${error.message}`,
  //     };
  //   }
  // }
  async cancelUnstructuredTask(
    warehouseId: string,
    batchId: string,
    taskId: string,
    config: any,
    input: any,
  ): Promise<TaskCancelRes> {
    try {
      const cancelRequest = await this._genericTaskTransformer(config, input);

      const structuredDto = plainToInstance(CancelReq, cancelRequest);
      const validationErrors = await this.validator.validate(structuredDto);
      if (validationErrors.length > 0) {
        throw new BadRequestException({
          status: 'error',
          message:
            'Transformer failed to produce a valid cancel request structure.',
          cancelled_at: new Date().toISOString(),
          task_id: taskId,
        });
      }

      return await this.cancelTask(warehouseId, batchId, taskId, structuredDto);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException({
          status: 'error',
          message: `Configuration not found`,
          cancelled_at: new Date().toISOString(),
          task_id: '',
        });
      }

      throw new BadRequestException({
        status: 'error',
        message: `Failed to process unstructured task cancellation: ${error.message}`,
        cancelled_at: new Date().toISOString(),
        task_id: '',
      });
    }
  }

  async getLocations(
    warehouseId: string,
    getLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
    try {
      const warehouse = await this.WarehouseRepository.findOne({
        where: { warehouse_id: warehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID '${warehouseId}' not found.`,
        );
      }
      if (!warehouse.locations_customer_managed) {
        return await get_location(getLocationReq);
      }
      return {
        "zone_id": '',
        "available_location_types": []
      }
    //   const mapping = warehouse.get_location_config;

    //   let apiEndpoint = mapping.endpoint.url;
    //   const path_params = mapping.request.path_params;
    //   console.log(`getLocation Request: ${JSON.stringify(getLocationReq)}`)
    //   if (!path_params) {
    //     throw new Error('Path parameters are not defined in the mapping.');
    //   }
    //   for (const path_param in path_params) {
    //     console.log(
    //       `Path Param: ${path_param}, Value: ${path_params[path_param]}`,
    //     );
    //     const paramValue = this.unstructureHelper(
    //       getLocationReq,
    //       path_params[path_param],
    //     )[1] || '';
        
    //     apiEndpoint = apiEndpoint.replaceAll(
    //       `:${path_param}`,
    //       encodeURIComponent(paramValue),
    //     );
    //   }

    //   const query_params = mapping.request.query_params;
    //   if (!query_params) {
    //     throw new Error('Query parameters are not defined in the mapping.');
    //   }
    //   if (query_params){
    //     apiEndpoint += '?'; // Start query parameters if any exist
    //   }
    //   for (const query_param in query_params) {
    //     if (query_params[query_param] === 'null') {
    //       continue; // Skip if the query parameter value is "null"
    //     }
    //     apiEndpoint += `${query_param}=${encodeURIComponent(
    //       String(this.unstructureHelper(getLocationReq, query_params[query_param])[1]) || '',
    //     )}&`;
    //   }
    //   console.log('API Endpoint:', apiEndpoint);
    //   // const payload: any = await this._genericTaskTransformer(
    //   //   mapping.request.body,
    //   //   getLocationReq,
    //   // );
    //   // console.log('Transformed Payload:', payload);
    //   const response = await fetch(apiEndpoint, {
    //     method: 'GET',
    //     headers: {
    //       'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiOTM5ZGQ5MzUtOTczOC00YmFlLTg3NmUtMDQ4NWI1ODE3OTU2IiwiaWF0IjoxNzU1MTg2Nzk2LCJleHAiOjE3NTUyNzMxOTZ9.LWCh_mQXcfkLz9vK98PR2hTCS-j2PTA_3T49WXloyk0`
    //     },
    //   });
      
    //   if (!response.ok) {
    //     throw new Error(`HTTP error! status: ${response.status}`);
    //   }
      
    //   const responseData = await response.json();
    //   // console.log('API Response:', responseData);
    //   const TransformedResponse = await this._genericTaskTransformer(
    //     mapping.response.body,
    //     responseData,
    //   );
    //   // console.log(
    //   //   'Transformed Response:',
    //   //   JSON.stringify(TransformedResponse, null, 2),
    //   // );
    //   return TransformedResponse as GetLocationRes;
    // } catch (error) {
    //   if (error.response) {
    //     throw new BadRequestException(
    //       `API request failed with status ${error.response.status}: ${error.response.data}`,
    //     );
    //   } else if (error.code === 'ENOENT') {
    //     throw new NotFoundException(`Configuration file not found`);
    //   } else {
    //     throw new BadRequestException(
    //       `Error processing request: ${error.message}`,
    //     );
    //   }
    } catch (error) {
      if (error.response) {
        throw new BadRequestException(
          `API request failed with status ${error.response.status}: ${error.response.data}`,
        );
      } else if (error.code === 'ENOENT') {
        throw new NotFoundException(`Configuration file not found`);
      } else {
        throw new BadRequestException(
          `Error processing request: ${error.message}`,
        );
      }
    }
  }

  async updateWebhook(
    warehouseId: string,
    updateWebhookDto: UpdateWebhookReq,
  ): Promise<UpdateWebhookRes> {
    try {
      const warehouse = await this.WarehouseRepository.findOne({
        where: { warehouse_id: warehouseId },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID '${warehouseId}' not found.`,
        );
      }

      // Update the webhook URL (can be undefined to clear it)
      warehouse.webhook_url = updateWebhookDto.webhook_url || null;
      await this.WarehouseRepository.save(warehouse);

      return {
        status: 'success',
        message: 'Webhook URL updated successfully',
        warehouse: {
          warehouse_id: warehouse.warehouse_id,
          warehouse_name: warehouse.warehouse_name,
          webhook_url: warehouse.webhook_url,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update webhook URL: ${error.message}`,
      );
    }
  }

  async updateLocationTracking(
    warehouseId: string,
    updateLocationTrackingDto: UpdateLocationTrackingReq,
  ): Promise<UpdateLocationTrackingRes> {
    try {
      const warehouse = await this.WarehouseRepository.findOne({
        where: { warehouse_id: warehouseId },
      });

      if (!warehouse) {
        throw new NotFoundException(
          `Warehouse with ID '${warehouseId}' not found.`,
        );
      }

      // Update the locations_customer_managed field
      warehouse.locations_customer_managed =
        updateLocationTrackingDto.locations_customer_managed;
      await this.WarehouseRepository.save(warehouse);

      return {
        status: 'success',
        message: 'Location tracking settings updated successfully',
        warehouse: {
          warehouse_id: warehouse.warehouse_id,
          warehouse_name: warehouse.warehouse_name,
          locations_customer_managed: warehouse.locations_customer_managed,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update location tracking settings: ${error.message}`,
      );
    }
  }

  async processIncomingData(incomingData: any): Promise<any> {
    // Process the incoming data and return the result
    console.log('Processing incoming data:', incomingData);
    return { success: true };
  }
}
