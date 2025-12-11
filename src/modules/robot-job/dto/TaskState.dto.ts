import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum TaskAction {
  Pause = 'pause',
  Resume = 'resume',
  CancelAndRetry = 'cancel&retry',
}

export class UpdateTaskStateReq {
  @ApiProperty({
    description: 'Action to perform on the task',
    enum: TaskAction,
    example: TaskAction.Pause,
  })
  @IsEnum(TaskAction, { message: 'Action must be either "pause", "resume", or "cancel&retry"' })
  @IsNotEmpty()
  action: TaskAction;

  @ApiProperty({
    description: 'Optional new task ID to assign when cancel and restarting a task',
    example: 'TASK_456',
    required: false,
  })
  @IsOptional()
  @IsString()
  new_task_id?: string;
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
