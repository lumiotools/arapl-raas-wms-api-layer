import { Inject, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import {
  Attribute,
  Cargo,
  LocationAction,
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { Task as TaskReq } from './dto/Task_Generation.dto';
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
import path from 'path';

@Injectable()
export class RobotJobService {
  constructor(
    @InjectRepository(BatchJob)
    private readonly BatchJobRepository: Repository<BatchJob>,

    @InjectRepository(Task)
    private readonly TaskRepository: Repository<Task>,

    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,
  ) {}

  async createTask(
    warehouseId: string,
    createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    const Tasks: any[] = createRobotJobDto.tasks;

    try {
      for (const task of Tasks) {
        if (task.start_location && task.start_location.location_id) {
          if (!task.start_location.location_id) {
            throw new Error('start_location.location_id is null');
          }
          const location = await this.LocationRepository.findOne({
            where: { location_id: task.start_location.location_id },
          });
          if (!location) {
            throw new Error(
              `Location with id ${task.start_location.location_id} does not exist`,
            );
          }
          await this.LocationRepository.update(
            { location_id: task.start_location.location_id },
            { isEmpty: false },
          );
        }
        else{
          throw new Error('start_location.location_id is null');
        }
        // Update end_location
        if (task.end_location && task.end_location.location_id) {
          if (!task.end_location.location_id) {
            throw new Error('end_location.location_id is null');
          }
          const endLocation = await this.LocationRepository.findOne({
            where: { location_id: task.end_location.location_id },
          });
          if (!endLocation) {
            throw new Error(
              `Location with id ${task.end_location.location_id} does not exist`,
            );
          }
          await this.LocationRepository.update(
            { location_id: task.end_location.location_id },
            { isEmpty: false },
          );
        }
        else{
          throw new Error('end_location.location_id is null');
        }
      }
      const batch_job_id = createRobotJobDto.batch_job_id;
      const uniqueness = await this.BatchJobRepository.findOne({
        where:
        { batch_job_id: batch_job_id, warehouse_id: warehouseId  },
      })
      if (uniqueness){
        throw new Error(
          `Batch job with id ${batch_job_id} already exists in warehouse ${warehouseId}. Combination of Batch Job ID and Warehouse ID must be unique.`,
        )
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
          status: 'pending',
        });
        const createdTask : Task = await this.TaskRepository.save(newTask);
        if (!createdTask) {
          throw new Error(
            `Failed to create task with ID ${task.task_id} for batch job ${createRobotJobDto.batch_job_id}.`,
          );
        }
      }
      return {
        batch_job_id: createRobotJobDto.batch_job_id,
        status: 'success',
      };
    } catch (error) {
      if (Tasks && Array.isArray(Tasks)) {
        for (const task of Tasks) {
          if (task.start_location && task.start_location.location_id) {
            await this.LocationRepository.update(
              { location_id: task.start_location.location_id },
              { isEmpty: true },
            );
          }
          if (task.end_location && task.end_location.location_id) {
            await this.LocationRepository.update(
              { location_id: task.end_location.location_id },
              { isEmpty: true },
            );
          }
        }
      }
      console.error('Error creating task:', error);
      return {
        batch_job_id: createRobotJobDto.batch_job_id,
        status: 'error',
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
            if (Array.isArray(current[baseKey]) && current[baseKey][index] !== undefined) {
              current = current[baseKey][index];
            } else {
              return [false, null, key];
            }
          } else {
            return [false, null, key];
          }
        }
        else{
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

  async transform(input: any, jsonData: any): Promise<any> {
    const Tasks: TaskReq[] = [];
    const [taskArraySuccess, taskArray, failedTaskKey] = this.unstructureHelper(
      input,
      jsonData['tasks'].source,
    );
    if (!taskArraySuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedTaskKey}' is incorrect and does not exist in the config file.`,
      };
    }

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

    for (const op of taskArray) {
      const map = jsonData['tasks']['map'];
      const keysToProcess = Object.keys(map);
      // const processedData: { [key: string]: any } = {};

      // for (const key of keysToProcess) {
      //   if (key.includes('cargo')) continue;

      //   const [success, value, failedKey] = this.unstructureHelper(
      //     op,
      //     map[key],
      //   );
      //   if (!success) {
      //     return {
      //       status: 'error',
      //       message: `Failed to create unstructured task, '${failedKey}' is incorrect and does not exist in the config file.`,
      //     };
      //   }
      //   processedData[key] = value;
      // }

      const [cargosSuccess, cargos, failedCargoKey] = this.unstructureHelper(
        op,
        map['cargos'].source,
      );
      const CARGOLIST: Cargo[] = [];
      if (!cargosSuccess) {
        let cargo_code = this.unstructureHelper(op, map['cargo_code']);
        // if (!cargo_code[0]) {
        // return {
        //   status: 'error',
        //   message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_code[2]}' is incorrect and does not exist in the config file.`,
        // };
        // }
        let cargo_type = this.unstructureHelper(op, map['cargo_type']);
        // if (!cargo_type[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_type[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_dimension_length = this.unstructureHelper(
          op,
          map.cargo_dimension.length,
        );
        // if (!cargo_dimension_length[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_length[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_dimension_width = this.unstructureHelper(
          op,
          map.cargo_dimension.width,
        );
        // if (!cargo_dimension_width[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_width[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_dimension_height = this.unstructureHelper(
          op,
          map.cargo_dimension.height,
        );
        // if (!cargo_dimension_height[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_height[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_weight = this.unstructureHelper(op, map['cargo_weight']);
        // if (!cargo_weight[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_weight[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_attributes_name = this.unstructureHelper(
          op,
          map.cargo_attributes.attribute_name,
        );
        // if (!cargo_attributes_name[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_attributes_name[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        let cargo_attributes_value = this.unstructureHelper(
          op,
          map.cargo_attributes.attribute_value,
        ); // if (!cargo_attributes_value[0]) {
        //   return {
        //     status: 'error',
        //     message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_attributes_value[2]}' is incorrect and does not exist in the config file.`,
        //   };
        // }

        CARGOLIST.push({
          cargo_code: cargo_code[1] ? cargo_code[1] : null,
          cargo_type: cargo_type[1] ? cargo_type[1] : null,
          cargo_dimension: {
            length: cargo_dimension_length[1]
              ? cargo_dimension_length[1]
              : null,
            width: cargo_dimension_width[1] ? cargo_dimension_width[1] : null,
            height: cargo_dimension_height[1]
              ? cargo_dimension_height[1]
              : null,
          },
          cargo_weight: cargo_weight[1] ? cargo_weight[1] : null,
          cargo_attributes: {
            attribute_name: cargo_attributes_name[1]
              ? cargo_attributes_name[1]
              : null,
            attribute_value: cargo_attributes_value[1]
              ? cargo_attributes_value[1]
              : null,
          } as Attribute,
        });
      } else {
        const mapCargos = map['cargos']['map'];
        for (let i = 0; i < cargos.length; i++) {
          const item = cargos[i];
          // const cargoKeysToProcess = Object.keys(mapCargos);
          // const processedCargoData: { [key: string]: any } = {};

          // for (const key of cargoKeysToProcess) {
          //   const [success, value, failedKey] = this.unstructureHelper(
          //     item,
          //     mapCargos[key],
          //   );
          //   if (!success) {
          //     return {
          //       status: 'error',
          //       message: `Failed to create unstructured task, '${failedKey}' is incorrect and does not exist in the config file.`,
          //     };
          //   }
          //   processedCargoData[key] = value;
          // }

          CARGOLIST.push({
            cargo_code:
              this.unstructureHelper(item, mapCargos['cargo_code'])[1] || null,
            cargo_type:
              this.unstructureHelper(item, mapCargos['cargo_type'])[1] || null,
            cargo_dimension: {
              length:
                this.unstructureHelper(
                  item,
                  mapCargos.cargo_dimension.length,
                )[1] || null,
              width:
                this.unstructureHelper(
                  item,
                  mapCargos.cargo_dimension.width,
                )[1] || null,
              height:
                this.unstructureHelper(
                  item,
                  mapCargos.cargo_dimension.height,
                )[1] || null,
            },
            cargo_weight:
              this.unstructureHelper(item, mapCargos['cargo_weight'])[1] ||
              null,
            cargo_attributes: {
              attribute_name:
                this.unstructureHelper(
                  item,
                  mapCargos.cargo_attributes.attribute_name,
                )[1] || null,
              attribute_value:
                this.unstructureHelper(
                  item,
                  mapCargos.cargo_attributes.attribute_value,
                )[1] || null,
            } as Attribute,
          });
        }
      }

      const task_id = this.unstructureHelper(op, map['task_id']);
      if (!task_id) {
        return {
          status: 'error',
          message: `Failed to create unstructured task, 'task_id' is missing in the input data.`,
        };
      }
      const task: TaskReq = {
        task_id: task_id[1],
        task_pallet_id:
          this.unstructureHelper(op, map['task_pallet_id'])[1] || null,
        task_type:
          this.unstructureHelper(op, map['task_type'])[1] || 'Crossdock',
        task_dependency:
          this.unstructureHelper(op, map['task_dependency'])[1] || null,
        start_location: {
          location_id:
            this.unstructureHelper(op, map.start_location.location_id)[1] ||
            null,
          location_zone:
            this.unstructureHelper(op, map.start_location.location_zone)[1] ||
            null,
          location_action:
            this.unstructureHelper(op, map.start_location.location_action)[1] ||
            'Nop',
          location_dimension: {
            length:
              this.unstructureHelper(
                op,
                map.start_location.location_dimension.length,
              )[1] || 0,
            width:
              this.unstructureHelper(
                op,
                map.start_location.location_dimension.width,
              )[1] || 0,
            height:
              this.unstructureHelper(
                op,
                map.start_location.location_dimension.height,
              )[1] || 0,
          },
          location_attribute: {
            attribute_name:
              this.unstructureHelper(
                op,
                map.start_location.location_attribute.attribute_name,
              )[1] || null,
            attribute_value:
              this.unstructureHelper(
                op,
                map.start_location.location_attribute.attribute_value,
              )[1] || null,
          },
        },
        end_location: {
          location_id:
            this.unstructureHelper(op, map.end_location.location_id)[1] || null,
          location_zone:
            this.unstructureHelper(op, map.end_location.location_zone)[1] ||
            null,
          location_action:
            this.unstructureHelper(op, map.end_location.location_action)[1] ||
            'Nop',
          location_dimension: {
            length:
              this.unstructureHelper(
                op,
                map.end_location.location_dimension.length,
              )[1] || 0,
            width:
              this.unstructureHelper(
                op,
                map.end_location.location_dimension.width,
              )[1] || 0,
            height:
              this.unstructureHelper(
                op,
                map.end_location.location_dimension.height,
              )[1] || 0,
          },
          location_attribute: {
            attribute_name:
              this.unstructureHelper(
                op,
                map.end_location.location_attribute.attribute_name,
              )[1] || null,
            attribute_value:
              this.unstructureHelper(
                op,
                map.end_location.location_attribute.attribute_value,
              )[1] || null,
          },
        },
        cargos: CARGOLIST,
        wait_time: {
          wait_type:
            this.unstructureHelper(op, map.wait_time.wait_type)[1] || 'None',
          start_location_wait_time:
            this.unstructureHelper(
              op,
              map.wait_time.start_location_wait_time,
            )[1] || 0,
          end_location_wait_time:
            this.unstructureHelper(
              op,
              map.wait_time.end_location_wait_time,
            )[1] || 0,
        },
      };

      Tasks.push(task);
    }

    const [batchJobIdSuccess, batch_job_id, failedBatchJobIdKey] =
      this.unstructureHelper(input, jsonData['batch_job_id']);
    if (!batchJobIdSuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedBatchJobIdKey}' is incorrect and does not exist in the config file.`,
      };
    }
    const [batchPrioritySuccess, batch_priority, failedBatchPriorityKey] =
      this.unstructureHelper(input, jsonData['batch_priority']);
    // if (!batchPrioritySuccess) {
    //   return {
    //     status: 'error',
    //     message: `Failed to create unstructured task, '${failedBatchPriorityKey}' is incorrect and does not exist in the config file.`,
    //   };
    // }

    const [batchTypeSuccess, batch_type, failedBatchTypeKey] =
      this.unstructureHelper(input, jsonData['batch_type']);
    // if (!batchTypeSuccess) {
    //   return {
    //     status: 'error',
    //     message: `Failed to create unstructured task, '${failedBatchTypeKey}' is incorrect and does not exist in the config file.`,
    //   };
    // }

    const [batchFrequencySuccess, batch_frequency, failedBatchFrequencyKey] =
      this.unstructureHelper(input, jsonData['batch_frequency']);
    // if (!batchFrequencySuccess) {
    //   return {
    //     status: 'error',
    //     message: `Failed to create unstructured task, '${failedBatchFrequencyKey}' is incorrect and does not exist in the config file.`,
    //   };
    // }
    const [warehouseIdSuccess, warehouse_id, failedWarehouseIdKey] =
      this.unstructureHelper(input, jsonData['warehouse_id']);
    // if (!warehouseIdSuccess) {
    //   return {
    //     status: 'error',
    //     message: `Failed to create unstructured task, '${failedWarehouseIdKey}' is incorrect and does not exist in the config file.`,
    //   };
    // }

    const TaskReq: TaskGenerationReq = {
      batch_job_id: batch_job_id,
      batch_priority: batch_priority || 5,
      batch_type: batch_type || 'Discrete',
      batch_frequency: batch_frequency,
      warehouse_id: warehouse_id,
      tasks: Tasks,
    };
    return TaskReq;
  }

  async createUnstructuredTask(
    warehouseId: string,
    configFolderName: string,
    operationType: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const taskrequest = await this.transform(input, jsonData);

      if (taskrequest.status === 'error') {
        return taskrequest;
      }

      const response = await this.createTask(warehouseId, taskrequest);
      return {
        status: 'success',
        message: 'Unstructured task created successfully',
        batch_job_id: response.batch_job_id,
        taskrequest: taskrequest,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: 'error',
          message: `Configuration file '${operationType}.json' not found in folder '${configFolderName}'.`,
        };
      }
      return {
        status: 'error',
        message: `Failed to process unstructured task: ${error.message}`,
      };
    }
  }

  async updateTask(
    warehouse_id: string,
    updateRobotJobDto: TaskUpdateReq,
  ): Promise<TaskUpdateRes> {
    const tasks: UpdateTask[] = updateRobotJobDto.updates;
    for (const task of tasks) {
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

      taskRepo.start_location.location_id = task.start_location.location_id;
      taskRepo.start_location.location_dimension =
        task.start_location.location_dimension;

      taskRepo.end_location.location_id = task.end_location.location_id;
      taskRepo.end_location.location_dimension =
        task.end_location.location_dimension;

      taskRepo.wait_time = task.wait_time;

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

  async updateUnstructuredTask(
    warehouseId: string,
    configFolderName: string,
    operationType: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configFolderName}/${operationType}.json`;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const updateRequest = await this.transformUpdate(input, jsonData);

      if ('status' in updateRequest && updateRequest.status === 'error') {
        return updateRequest;
      }

      return await this.updateTask(warehouseId, updateRequest as TaskUpdateReq);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: 'error',
          message: `Configuration file '${operationType}.json' not found in folder '${configFolderName}'.`,
        };
      }
      return {
        status: 'error',
        message: `Failed to process unstructured task update: ${error.message}`,
      };
    }
  }

  async transformUpdate(
    input: any,
    jsonData: any,
  ): Promise<TaskUpdateReq | { status: string; message: string }> {
    const [batchJobIdSuccess, batch_job_id, failedBatchJobIdKey] =
      this.unstructureHelper(input, jsonData['batch_job_id']);
    if (!batchJobIdSuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task update, '${failedBatchJobIdKey}' is incorrect.`,
      };
    }

    const [timestampSuccess, timestamp, failedTimestampKey] =
      this.unstructureHelper(input, jsonData['timestamp']);
    if (!timestampSuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task update, '${failedTimestampKey}' is incorrect.`,
      };
    }

    const updates: UpdateTask[] = [];
    const [taskArraySuccess, taskArray, failedTaskKey] = this.unstructureHelper(
      input,
      jsonData['updates'].source,
    );
    if (!taskArraySuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task update, '${failedTaskKey}' is incorrect.`,
      };
    }
    if (!Array.isArray(taskArray)) {
      return { status: 'error', message: 'Update task array is not an array' };
    }

    for (const op of taskArray) {
      const map = jsonData['updates']['map'];

      const safeExtract = (path: string, required = false) => {
        const [success, value, failedKey] = this.unstructureHelper(op, path);
        if (!success && required) {
          throw new Error(
            `Required field '${failedKey}' is missing or incorrect.`,
          );
        }
        return success ? value : null;
      };

      try {
        const task_id = safeExtract(map.task_id, true);

        const task_dependency = safeExtract(map.task_dependency);

        const start_location_id = safeExtract(
          map.start_location.location_id,
          false,
        );
        const start_location_length = safeExtract(
          map.start_location.location_dimension?.length,
        );
        const start_location_width = safeExtract(
          map.start_location.location_dimension?.width,
        );
        const start_location_height = safeExtract(
          map.start_location.location_dimension?.height,
        );

        const end_location_id = safeExtract(map.end_location.location_id, true);
        const end_location_length = safeExtract(
          map.end_location.location_dimension?.length,
        );
        const end_location_width = safeExtract(
          map.end_location.location_dimension?.width,
        );
        const end_location_height = safeExtract(
          map.end_location.location_dimension?.height,
        );

        const wait_type = safeExtract(map.wait_time?.wait_type);
        const start_location_wait_time = safeExtract(
          map.wait_time?.start_location_wait_time,
        );
        const end_location_wait_time = safeExtract(
          map.wait_time?.end_location_wait_time,
        );

        const updateTask: UpdateTask = {
          task_id,
          task_dependency,
          start_location: {
            location_id: start_location_id,
            location_dimension: {
              length: start_location_length,
              width: start_location_width,
              height: start_location_height,
            },
            cargo_quantity: 0,
          },
          end_location: {
            location_id: end_location_id,
            location_dimension: {
              length: end_location_length,
              width: end_location_width,
              height: end_location_height,
            },
            cargo_quantity: 0,
          },
          wait_time: {
            wait_type: wait_type || 'None',
            start_location_wait_time: start_location_wait_time || 0,
            end_location_wait_time: end_location_wait_time || 0,
          },
          cargos: [],
        };

        if (map.cargos) {
          const [cargosSuccess, cargos] = this.unstructureHelper(
            op,
            map.cargos.source,
          );
          if (cargosSuccess && Array.isArray(cargos)) {
            const cargoMap = map.cargos.map;
            for (const cargo of cargos) {
              const cargoCode = this.unstructureHelper(
                cargo,
                cargoMap.cargo_code,
              )[1];
              if (cargoCode) {
                updateTask.cargos.push({
                  cargo_code: cargoCode,
                  cargo_dimension: {
                    length: this.unstructureHelper(
                      cargo,
                      cargoMap.cargo_dimension?.length,
                    )[1],
                    width: this.unstructureHelper(
                      cargo,
                      cargoMap.cargo_dimension?.width,
                    )[1],
                    height: this.unstructureHelper(
                      cargo,
                      cargoMap.cargo_dimension?.height,
                    )[1],
                  },
                  cargo_quantity:
                    this.unstructureHelper(cargo, cargoMap.cargo_quantity)[1] ||
                    0,
                  cargo_weight: this.unstructureHelper(
                    cargo,
                    cargoMap.cargo_weight,
                  )[1],
                });
              }
            }
          }
        }

        updates.push(updateTask);
      } catch (error) {
        return {
          status: 'error',
          message: error.message,
        };
      }
    }

    return {
      batch_job_id,
      updates,
      timestamp,
    };
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
          status: 'not_found',
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
        status: 'not_found',
        cancelled_at: new Date().toISOString(),
        message: `Task with ID ${task_id} not found in warehouse ${warehouse_id}.`,
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
      const cancelRequest = await this.transformCancel(input, jsonData);

      if ('status' in cancelRequest && cancelRequest.status === 'error') {
        return cancelRequest;
      }

      return await this.cancelTask(
        warehouseId,
        cancelRequest as TaskCancelReq | BatchCancelReq,
      );
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: 'error',
          message: `Configuration file '${operationType}.json' not found in folder '${configFolderName}'.`,
        };
      }
      return {
        status: 'error',
        message: `Failed to process unstructured task cancellation: ${error.message}`,
      };
    }
  }

  async transformCancel(
    input: any,
    jsonData: any,
  ): Promise<
    TaskCancelReq | BatchCancelReq | { status: string; message: string }
  > {
    const safeExtract = (path: string, required = false) => {
      if (!path || path === 'null') return [true, null, null];

      const [success, value, failedKey] = this.unstructureHelper(input, path);
      if (!success && required) {
        return [false, null, failedKey];
      }
      return [success, value, failedKey];
    };

    const [batchJobIdSuccess, batch_job_id, failedBatchJobIdKey] = safeExtract(
      jsonData['batch_job_id'],
    );
    const [taskIdSuccess, task_id, failedTaskIdKey] = safeExtract(
      jsonData['task_id'],
    );
    const [reasonSuccess, reason, failedReasonKey] = safeExtract(
      jsonData['reason'],
    );
    const [timestampSuccess, timestamp, failedTimestampKey] = safeExtract(
      jsonData['timestamp'],
    );

    if (!batchJobIdSuccess && !taskIdSuccess) {
      return {
        status: 'error',
        message: `Failed to process cancellation, both 'batch_job_id' and 'task_id' are missing or incorrect.`,
      };
    }

    if (batch_job_id && !task_id) {
      return {
        batch_job_id,
        reason: reason || undefined,
        timestamp: timestamp || undefined,
      };
    } else if (task_id) {
      return {
        task_id,
        reason: reason || undefined,
        timestamp: timestamp || undefined,
      };
    } else {
      return {
        status: 'error',
        message:
          'Either batch_job_id or task_id must be provided for cancellation.',
      };
    }
  }

  async empty_locationTransform(
    mapping: any,
    input: GetLocationReq,
  ): Promise<any> {
    try{
        if (input == null || mapping == null) {
          return {};
        }
        if (mapping.object_type == "object"){
        let currObject: Object = {};
        for (const key in mapping){
          if (key == 'object_type' || key == 'source' || key == 'map' || key == 'endpoint'){
            continue;
          }
          if (mapping[key].object_type == "number"){
            currObject[key] = Number(this.unstructureHelper(input, mapping[key].path)[1]) ?? 0;
          }
          else if (mapping[key].object_type == "string"){
            currObject[key] = String(this.unstructureHelper(input, mapping[key].path)[1]) ?? '';
          }
          else if (mapping[key].object_type == "array"){
            currObject[key] = await this.empty_locationTransform(mapping[key], input);
          }
          else if (mapping[key].object_type == "object"){
            currObject[key] = await this.empty_locationTransform(mapping[key], input);
          }
          else if (mapping[key].object_type == "boolean"){
            currObject[key] = Boolean(this.unstructureHelper(input, mapping[key].path)[1]) ?? false;
          }
          else if (mapping[key].object_type == "null"){
            continue;
          }
        }
        return currObject;
      }
      else{
        let currObject: Object[] = [];
        const arrayMap = mapping.map;
        const currentArray = this.unstructureHelper(input, mapping.source)[1] || [];
        if (mapping.source_type=='object'){
          const obj = await this.empty_locationTransform(arrayMap, currentArray);
          currObject.push(obj);
          return currObject;
        }
        for (const item of currentArray) {
          const currentItem: Object = await this.empty_locationTransform(arrayMap, item);
          currObject.push(currentItem);
        }
        return currObject;
      }
    }
    catch (error) {
      console.error('Error in empty_locationTransform:', error);
      return {};
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

      // incorporting all path parameters
      const path_params =  mapping.request.path_params;
      if (!path_params) {
        throw new Error('Path parameters are not defined in the mapping.');
      }
      for (const path_param in path_params) {
        console.log(`Path Param: ${path_param}, Value: ${path_params[path_param]}`);
        apiEndpoint = apiEndpoint.replace(
          `:${path_param}`,
          encodeURIComponent(this.unstructureHelper(getLocationReq, path_params[path_param])[1] || ''),
        );
      }

      // incorporting all query parameters
      const query_params = mapping.request.query_params;
      if (!query_params) {
        throw new Error('Query parameters are not defined in the mapping.');
      }
      for (const query_param in query_params) {
        if (query_params[query_param] === "null") {
          continue; // Skip if the query parameter value is "null"
        }
        apiEndpoint += `?${query_param}=${encodeURIComponent(query_params[query_param])}`;
      }


      const payload: any = await this.empty_locationTransform(mapping.request.body,getLocationReq);
      console.log('Transformed Payload:', payload);
      const response = await axios.post(apiEndpoint, getLocationReq, {
        headers: {
          'Content-Type': mapping.endpoint.headers['Content-Type'],
        },
        data: getLocationReq,
      });
      console.log('API Response:', response.data);
      const responseData = response.data;
      const TransformedResponse = await this.empty_locationTransform(
        mapping.response.body,
        responseData,
      )
      console.log('Transformed Response:', JSON.stringify(TransformedResponse, null, 2));
      return TransformedResponse as GetLocationRes;

    } catch (error) {
      return {
        zone_id: '',
        available_location_types: [],
      };
    }
  }

  async getStrpDropLocations(
    warehouseId: string,
    location: number,
  ): Promise<GetLocationRes> {
    // Find all locations with isEmpty=true and location_action='Drop'
    const allLocations = await this.LocationRepository.find({
      where: {
        isEmpty: true,
        location_action: LocationAction.Drop,
      },
    });

    const zoneMap: Record<string, Location[]> = {};
    for (const loc of allLocations) {
      if (!zoneMap[loc.location_zone]) {
        zoneMap[loc.location_zone] = [];
      }
      zoneMap[loc.location_zone].push(loc);
    }

    // Find a zone with at least 'location' number of available locations
    let selectedZoneId: string | null = null;
    let selectedLocations: Location[] = [];
    for (const [zoneId, locs] of Object.entries(zoneMap)) {
      if (locs.length >= location) {
        selectedZoneId = zoneId;
        selectedLocations = locs;
        break;
      }
    }

    if (!selectedZoneId) {
      return {
        zone_id: '',
        available_location_types: [],
      };
    }

    // Sort locations by dropPriority in ascending order before returning
    selectedLocations.sort(
      (a, b) => (a.dropPriority ?? 0) - (b.dropPriority ?? 0),
    );
    return {
      zone_id: selectedZoneId,
      available_location_types: selectedLocations,
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
