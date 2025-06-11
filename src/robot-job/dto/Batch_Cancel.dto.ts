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
  task_id: string;
  status: string;
  cancelled_at: string;
  message: string;
}
