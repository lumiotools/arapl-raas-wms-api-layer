import { Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { Task, TaskGenerationReq, TaskGenerationRes } from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { Task as UpdateTask } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import axios from 'axios';

@Injectable()
export class RobotJobService {

  async createTask(warehouseId: string, createRobotJobDto: TaskGenerationReq): Promise<TaskGenerationRes> {
    console.log(`Creating tasks for warehouse: ${warehouseId}`);
    console.log(createRobotJobDto.batch_job_id);
    await new Promise(resolve => setTimeout(resolve, 10000));
    const payload = {
      "pagination": {
        "current_page": 1,
        "total_pages": 3,
        "total_records": 12
      },
      "batch_job_id": "BATCH-20240413-004",
      "batch_priority": 2,
      "batch_job_status": "task_in_progress",
      "timestamp": "2024-04-13T12:45:00Z",
      "tasks_status": [
        {
          "task_id": "TASK-001",
          "status": "robot_assigned",
          "robot_id": "ROBOT-001",
          "end_location": {
            "location_id": "LOC-END-001",
            "location_dimension": {
              "length": 120,
              "width": 90,
              "height": 160
            }
          },
          "cargos": [
            {
              "cargo_code": "CARGO-001",
              "cargo_weight": 50
            }
          ]
        },
        {
          "task_id": "TASK-002",
          "status": "pickup_successful",
          "start_location": {
            "location_id": "LOC-START-002",
            "location_dimension": {
              "length": 100,
              "width": 80,
              "height": 150
            }
          },
          "end_location": {
            "location_id": "LOC-END-002",
            "location_dimension": {
              "length": 110,
              "width": 85,
              "height": 155
            }
          },
          "cargos": [
            {
              "cargo_code": "CARGO-002",
              "cargo_weight": 45
            }
          ]
        }
      ]
    }
    await axios.post(
      `http://localhost:6789/api/webhook/${warehouseId}/task_status_update_webhook`,
      payload,
      {
      headers: {
        'Content-Type': 'application/json',
      },
      }
    );
    return {
      batch_job_id: createRobotJobDto.batch_job_id,
      status: 'success',
    };
  }

  updateTask(warehouse_id: string, updateRobotJobDto: TaskUpdateReq): TaskUpdateRes {
    const updatedTasks: UpdateTask[] = updateRobotJobDto.updates.map(task => ({
      ...task,
      task_id: task.task_id,
      updated_at: new Date().toISOString(),
      status: 'updated',
      message: 'Task updated successfully',
    }));

    return {
      task_id: updatedTasks[0].task_id,
      status: 'success',
      updated_at: new Date().toISOString(),
      message: 'Tasks updated successfully',
    };
  }

  cancelTask(warehouse_id: string, updateRobotJobDto: TaskCancelReq): TaskCancelRes {
    return {
      task_id: updateRobotJobDto.task_id,
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      message: 'Task cancelled successfully',
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
