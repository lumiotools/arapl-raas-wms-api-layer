import { Injectable } from '@nestjs/common';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { Task, TaskGenerationReq, TaskGenerationRes } from './model/Task_Generation.model';
import { TaskUpdateReq, TaskUpdateRes } from './model/Task_Update.model';
import { Task as UpdateTask } from './model/Task_Update.model';
import { TaskCancelReq, TaskCancelRes } from './model/Task_Cancel.model';

@Injectable()
export class RobotJobService {

  createTask(warehouseId: string, createRobotJobDto: TaskGenerationReq): TaskGenerationRes {
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
