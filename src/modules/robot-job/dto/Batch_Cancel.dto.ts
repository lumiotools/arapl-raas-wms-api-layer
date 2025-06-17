import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class BatchCancelReq {
  @IsString()
  @IsNotEmpty()
  batch_job_id: string;

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
