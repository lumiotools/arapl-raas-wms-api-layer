// import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// export class CancelReq {
//   @IsOptional()
//   @IsString()
//   reason?: string;

//   @IsOptional()
//   @IsString()
//   timestamp?: string;
// }

// export class BatchCancelRes {
//   @IsString()
//   @IsNotEmpty()
//   task_id: string;

//   @IsString()
//   @IsNotEmpty()
//   status: string;

//   @IsString()
//   @IsNotEmpty()
//   cancelled_at: string;

//   @IsString()
//   @IsNotEmpty()
//   message: string;
// }

// export class TaskCancelRes {
//   @IsString()
//   @IsNotEmpty()
//   task_id: string;

//   @IsString()
//   @IsNotEmpty()
//   status: string;

//   @IsString()
//   @IsNotEmpty()
//   cancelled_at: string;

//   @IsString()
//   @IsNotEmpty()
//   message: string;
// }

import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelReq {
  @ApiPropertyOptional({
    description: 'Reason for cancelling the task',
    example: 'Task no longer needed',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Timestamp of when the cancel request was made',
    example: '2025-06-24T10:15:00Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class BatchCancelRes {
  @ApiProperty({
    description: 'ID of the task that was cancelled',
    example: 'task_12345',
  })
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @ApiProperty({
    description: 'Cancellation status',
    example: 'cancelled',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Time when the task was cancelled',
    example: '2025-06-24T10:20:00Z',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_at: string;

  @ApiProperty({
    description: 'Message providing context about the cancellation',
    example: 'Task was successfully cancelled',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class TaskCancelRes {
  @ApiProperty({
    description: 'ID of the task that was cancelled',
    example: 'task_67890',
  })
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @ApiProperty({
    description: 'Cancellation status',
    example: 'cancelled',
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({
    description: 'Time when the task was cancelled',
    example: '2025-06-24T10:21:00Z',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_at: string;

  @ApiProperty({
    description: 'Message providing context about the cancellation',
    example: 'Task was successfully cancelled',
  })
  @IsString()
  @IsNotEmpty()
  message: string;
}
