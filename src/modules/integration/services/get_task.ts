import { BadRequestException } from '@nestjs/common';
import fetch from 'node-fetch';
import { INTEGRATION_URL } from 'src/constants/integrations';
import { GetTasksResponseDto } from 'src/modules/robot-job/dto/GetTasks.dto';
import { TaskType } from 'src/modules/robot-job/dto/Task_Generation.dto';
import { Task } from 'src/modules/robot-job/entities/task.entity';

interface getTasks {
  warehouse_id: string;
  batch_job_id: string;
}

export async function get_tasks(
  payload: getTasks,
  task_type: TaskType
): Promise<GetTasksResponseDto> {
  try {
    // let URL = process.env.FMS_BASE_URL;
    let URL = INTEGRATION_URL[task_type];
    if (!URL) {
      throw new BadRequestException('Invalid task type specified'); 
    }
    const response = await fetch(
      `${URL}/wms-integration-wrapper/robot-job/${payload.warehouse_id}/tasks/${payload.batch_job_id}`,
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(
        `Failed to get tasks: ${response.status} ${errorText}`,
      );
    }
    const batch = await response.json();

    let batchResponse = {
      batch_job_id: batch.batch_job_id,
      batch_priority: batch.batch_priority,
      batch_type: String(batch.batch_type).toUpperCase(),
      batch_frequency: batch.batch_frequency,
      batch_job_status: batch.batch_job_status,
      tasks: batch.tasks.map((task: any) => ({
        task_id: task.task_id,
        task_type: String(task.task_type).toUpperCase(),
        task_dependency: task.task_dependency,
        robot_id: task.robot_id,
        start_location: {
          location_id: task.start_location.location_id,
          location_type: String(task.start_location.location_type).toUpperCase(),
          location_action: String(task.start_location.location_action).toUpperCase(),
          location_dimensions: task.start_location.location_dimensions,
        },
        end_location: {
          location_id: task.end_location.location_id,
          location_type: String(task.end_location.location_type).toUpperCase(),
          location_action: String(task.end_location.location_action).toUpperCase(),
          location_dimensions: task.end_location.location_dimensions,
        },
        status: task.status,
      })),
    };

    return batchResponse as GetTasksResponseDto;
  } catch (error) {
    throw new BadRequestException(error.message);
  }
}
