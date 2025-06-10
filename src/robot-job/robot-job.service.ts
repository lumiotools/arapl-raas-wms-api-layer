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
import { Task } from './entities/task.entity'; // Adjust the import path as necessary
import { OschestratorService } from 'src/oschestrator/oschestrator.service'; // Adjust the import path as necessary
import { queueElementDto } from 'src/oschestrator/dto/queue.dto';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { Location } from './entities/locations.entity'; // Adjust the import path as necessary
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

    private readonly oschestratorService: OschestratorService, // Inject the orchestrator service
  ) {}

  async createTask(
    warehouseId: string,
    createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    const newBatchJob: BatchJob = this.BatchJobRepository.create({
      batch_job_id: createRobotJobDto.batch_job_id,
      warehouse_id: warehouseId, // Changed: Added warehouse_id here
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
      if (expression === 'null') {
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
        if (key === 'cargos') continue;

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

      if (!cargosSuccess) {
        return {
          status: 'error',
          message: `Failed to create unstructured task, '${failedCargoKey}' is incorrect and does not exist in the config file.`,
        };
      }

      const CARGOLIST: Cargo[] = [];
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
          cargo_type: processedCargoData.cargo_type,
          cargo_dimension: {
            length: processedCargoData.cargo_dimension_length,
            width: processedCargoData.cargo_dimension_width,
            height: processedCargoData.cargo_dimension_height,
          },
          cargo_weight: processedCargoData.cargo_weight,
          cargo_attributes: {
            attribute_name: processedCargoData.cargo_attributes_name,
            attribute_value: processedCargoData.cargo_attributes_value,
          } as Attribute,
        });
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

    const TaskReq: TaskGenerationReq = {
      batch_job_id: batch_job_id,
      batch_priority: batch_priority || 5,
      batch_type: batch_type || 'Discrete',
      batch_frequency: batch_frequency,
      tasks: Tasks,
    };
    return TaskReq;
  }
  async createUnstructuredTask(
    warehouseId: string,
    configName: string,
    input: any,
  ): Promise<any> {
    const filePath = `src/config/data_config/${configName}.json`;
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
          // Changed: Scope query by warehouse_id for security
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

  async cancelTask(
    warehouse_id: string,
    updateRobotJobDto: TaskCancelReq | BatchCancelReq,
  ): Promise<TaskCancelRes | BatchCancelRes> {
    if ('batch_job_id' in updateRobotJobDto) {
      // Handle batch cancellation
      const batchJob = await this.BatchJobRepository.findOne({
        // Changed: Scope query by warehouse_id
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
    const task_id = updateRobotJobDto.task_id;
    // Changed: Scope query by warehouse_id for single task cancellation
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

  async getEmptyLocations(
    warehouseId: string,
    getLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
    // Recommendation: If your Location entity has a warehouse_id,
    // you should add it to the 'where' clause here for better filtering.
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
