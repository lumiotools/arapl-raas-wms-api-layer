import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CancelReq {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class BatchCancelRes {
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  cancelled_at: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}

export class TaskCancelRes {
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsNotEmpty()
  cancelled_at: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
