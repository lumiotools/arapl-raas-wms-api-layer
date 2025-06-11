import { Inject, Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import {
  Attribute,
  Cargo,
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { Task as TaskReq } from './dto/Task_Generation.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { OschestratorService } from 'src/oschestrator/oschestrator.service';
import { queueElementDto } from 'src/oschestrator/dto/queue.dto';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { Location } from './entities/locations.entity';
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';
import * as fs from 'fs/promises';

@Injectable()
export class RobotJobService {
  constructor(
    @InjectRepository(BatchJob)
    private readonly BatchJobRepository: Repository<BatchJob>,

    @InjectRepository(Task)
    private readonly TaskRepository: Repository<Task>,

    @InjectRepository(Location)
    private readonly LocationRepository: Repository<Location>,

    private readonly oschestratorService: OschestratorService,
  ) {}

  async createTask(
    warehouseId: string,
    createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    const newBatchJob: BatchJob = this.BatchJobRepository.create({
      batch_job_id: createRobotJobDto.batch_job_id,
      warehouse_id: warehouseId,
      batch_priority: createRobotJobDto.batch_priority,
      batch_type: createRobotJobDto.batch_type,
      batch_frequency: createRobotJobDto.batch_frequency,
    });
    await this.BatchJobRepository.save(newBatchJob);

    const newTasks: Task[] = [];
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
    };

    // await this.oschestratorService.orchestrate(queueElementDto);

    return {
      batch_job_id: createRobotJobDto.batch_job_id,
      status: 'success',
    };
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
        if (
          current === null ||
          current === undefined ||
          typeof current !== 'object' ||
          !(key in current)
        ) {
          return [false, null, key];
        }
        current = current[key];
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
      const processedData: { [key: string]: any } = {};

      for (const key of keysToProcess) {
        if (key.includes('cargo')) continue;

        const [success, value, failedKey] = this.unstructureHelper(
          op,
          map[key],
        );
        if (!success) {
          return {
            status: 'error',
            message: `Failed to create unstructured task, '${failedKey}' is incorrect and does not exist in the config file.`,
          };
        }
        processedData[key] = value;
      }

      const [cargosSuccess, cargos, failedCargoKey] = this.unstructureHelper(
        op,
        map['cargos'].source,
      );
      const CARGOLIST: Cargo[] = [];
      if (!cargosSuccess) {
        let cargo_code = this.unstructureHelper(op, map['cargo_code']);
        if (!cargo_code[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_code[2]}' is incorrect and does not exist in the config file.`,
          };
        }
        let cargo_type = this.unstructureHelper(op, map['cargo_type']);
        if (!cargo_type[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_type[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        let cargo_dimension_length = this.unstructureHelper(
          op,
          map['cargo_dimension_length'],
        );
        if (!cargo_dimension_length[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_length[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        let cargo_dimension_width = this.unstructureHelper(
          op,
          map['cargo_dimension_width'],
        );
        if (!cargo_dimension_width[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_width[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        let cargo_dimension_height = this.unstructureHelper(
          op,
          map['cargo_dimension_height'],
        );
        if (!cargo_dimension_height[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_dimension_height[2]}' is incorrect and does not exist in the config file.`,
          };
        }
        let cargo_weight = this.unstructureHelper(op, map['cargo_weight']);
        if (!cargo_weight[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_weight[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        let cargo_attributes_name = this.unstructureHelper(
          op,
          map['cargo_attributes_name'],
        );
        if (!cargo_attributes_name[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_attributes_name[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        let cargo_attributes_value = this.unstructureHelper(
          op,
          map['cargo_attributes_value'],
        );
        if (!cargo_attributes_value[0]) {
          return {
            status: 'error',
            message: `INFO-Cargo list is not present. Failed to create unstructured task, '${cargo_attributes_value[2]}' is incorrect and does not exist in the config file.`,
          };
        }

        CARGOLIST.push({
          cargo_code: cargo_code[1],
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
          const cargoKeysToProcess = Object.keys(mapCargos);
          const processedCargoData: { [key: string]: any } = {};

          for (const key of cargoKeysToProcess) {
            const [success, value, failedKey] = this.unstructureHelper(
              item,
              mapCargos[key],
            );
            if (!success) {
              return {
                status: 'error',
                message: `Failed to create unstructured task, '${failedKey}' is incorrect and does not exist in the config file.`,
              };
            }
            processedCargoData[key] = value;
          }

          CARGOLIST.push({
            cargo_code: processedCargoData.cargo_code,
            cargo_type: processedCargoData.cargo_type
              ? processedCargoData.cargo_type
              : null,
            cargo_dimension: {
              length: processedCargoData.cargo_dimension_length
                ? processedCargoData.cargo_dimension_length
                : null,
              width: processedCargoData.cargo_dimension_width
                ? processedCargoData.cargo_dimension_width
                : null,
              height: processedCargoData.cargo_dimension_height
                ? processedCargoData.cargo_dimension_height
                : null,
            },
            cargo_weight: processedCargoData.cargo_weight
              ? processedCargoData.cargo_weight
              : null,
            cargo_attributes: {
              attribute_name: processedCargoData.cargo_attributes_name
                ? processedCargoData.cargo_attributes_name
                : null,
              attribute_value: processedCargoData.cargo_attributes_value
                ? processedCargoData.cargo_attributes_value
                : null,
            } as Attribute,
          });
        }
      }

      const task: TaskReq = {
        task_id: processedData.task_id,
        task_pallet_id: processedData.task_pallet_id,
        task_type: processedData.task_type || 'Crossdock',
        task_dependency: processedData.task_dependency,
        start_location: {
          location_id: processedData.start_location_id,
          location_zone: processedData.start_location_zone,
          location_action: processedData.start_location_action || 'Nop',
          location_dimension: {
            length: processedData.start_location_dimension_length,
            width: processedData.start_location_dimension_width,
            height: processedData.start_location_dimension_height,
          },
          location_attribute: {
            attribute_name: processedData.start_location_attribute_name,
            attribute_value: processedData.start_location_attribute_value,
          },
        },
        end_location: {
          location_id: processedData.end_location_id,
          location_zone: processedData.end_location_zone,
          location_action: processedData.end_location_action || 'Nop',
          location_dimension: {
            length: processedData.end_location_dimension_length,
            width: processedData.end_location_dimension_width,
            height: processedData.end_location_dimension_height,
          },
          location_attribute: {
            attribute_name: processedData.end_location_attribute_name,
            attribute_value: processedData.end_location_attribute_value,
          },
        },
        cargos: CARGOLIST,
        wait_time: {
          wait_type: processedData.wait_time_wait_type || 'None',
          start_location_wait_time:
            processedData.wait_time_start_location_wait_time || 0,
          end_location_wait_time:
            processedData.wait_time_end_location_wait_time || 0,
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
    if (!batchPrioritySuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedBatchPriorityKey}' is incorrect and does not exist in the config file.`,
      };
    }

    const [batchTypeSuccess, batch_type, failedBatchTypeKey] =
      this.unstructureHelper(input, jsonData['batch_type']);
    if (!batchTypeSuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedBatchTypeKey}' is incorrect and does not exist in the config file.`,
      };
    }

    const [batchFrequencySuccess, batch_frequency, failedBatchFrequencyKey] =
      this.unstructureHelper(input, jsonData['batch_frequency']);

    if (!batchFrequencySuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedBatchFrequencyKey}' is incorrect and does not exist in the config file.`,
      };
    }

    const [warehouseIdSuccess, warehouse_id, failedWarehouseIdKey] =
      this.unstructureHelper(input, jsonData['warehouse_id']);
    if (!warehouseIdSuccess) {
      return {
        status: 'error',
        message: `Failed to create unstructured task, '${failedWarehouseIdKey}' is incorrect and does not exist in the config file.`,
      };
    }

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
    configName: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configName}.json`;
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
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          status: 'error',
          message: `Configuration file '${configName}.json' not found.`,
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
    configName: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configName}.json`;
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
          message: `Configuration file '${configName}.json' not found.`,
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
    // Required fields
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

      // Helper function to safely extract values (returns null for missing optional fields)
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
        // Required field
        const task_id = safeExtract(map.task_id, true);

        // Optional fields - these will return null if not present
        const task_dependency = safeExtract(map.task_dependency);

        // Start location - location_id is required, others optional
        const start_location_id = safeExtract(
          map.start_location.location_id,
          true,
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

        // End location - location_id is required, others optional
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

        // Wait time - all optional
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
          cargos: [], // Handle cargos separately if needed
        };

        // Handle cargos if present in the mapping
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
    configName: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config_mapping/${configName}.json`;
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
          message: `Configuration file '${configName}.json' not found.`,
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
    // Helper function to safely extract values
    const safeExtract = (path: string, required = false) => {
      if (!path || path === 'null') return [true, null, null];

      const [success, value, failedKey] = this.unstructureHelper(input, path);
      if (!success && required) {
        return [false, null, failedKey];
      }
      return [success, value, failedKey];
    };

    // Extract fields - some may be optional depending on your business logic
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

    // Check if we have at least batch_job_id or task_id (one should be required)
    if (!batchJobIdSuccess && !taskIdSuccess) {
      return {
        status: 'error',
        message: `Failed to process cancellation, both 'batch_job_id' and 'task_id' are missing or incorrect.`,
      };
    }

    // Optional fields can fail without causing errors
    // Only log warnings for missing optional fields if needed

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

  async getEmptyLocations(
    warehouseId: string,
    getLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
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
    } else if (getLocationReq.location_type === 'Pick') {
      locations.sort(
        (a, b) => (a.pickupPriority ?? 0) - (b.pickupPriority ?? 0),
      );
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
