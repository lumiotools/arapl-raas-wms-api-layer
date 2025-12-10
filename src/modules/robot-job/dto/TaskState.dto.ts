import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TaskAction {
  Pause = 'pause',
  Resume = 'resume',
}

export class UpdateTaskStateReq {
  @ApiProperty({
    description: 'Action to perform on the task',
    enum: TaskAction,
    example: TaskAction.Pause,
  })
  @IsEnum(TaskAction, { message: 'Action must be either "pause" or "resume"' })
  @IsNotEmpty()
  action: TaskAction;
}

export class UpdateTaskStateRes {
  @ApiProperty({
    description: 'ID of the task that was updated',
    example: 'TASK_123',
  })
  task_id: string;

  @ApiProperty({
    description: 'Status of the operation',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Current state of the task after update',
    example: 'paused',
  })
  state: string;

  @ApiProperty({
    description: 'Additional message about the operation',
    example: 'Task has been paused successfully',
  })
  message: string;
}
