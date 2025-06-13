import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TaskCancelReq {
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @IsOptional()
  @IsString()
  warehouse_id?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TaskCancelRes {
  task_id: string;
  status: string;
  cancelled_at: string;
  message: string;
}
