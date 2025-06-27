import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTaskConfigDto {
  @ApiProperty({
    description: 'Configuration mapping for create task operations',
    example: {
      object_type: 'object',
      batch_job_id: { object_type: 'string', path: 'input.job_id' },
      // ... other mapping fields
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class UpdateTaskConfigDto {
  @ApiProperty({
    description: 'Configuration mapping for update task operations',
    example: {
      object_type: 'object',
      batch_job_id: { object_type: 'string', path: 'input.job_id' },
      // ... other mapping fields
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class CancelTaskConfigDto {
  @ApiProperty({
    description: 'Configuration mapping for cancel task operations',
    example: {
      object_type: 'object',
      reason: { object_type: 'string', path: 'input.cancellation_reason' },
      timestamp: {
        object_type: 'string',
        path: 'input.cancellation_timestamp',
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class GetLocationConfigDto {
  @ApiProperty({
    description: 'Configuration mapping for get location operations',
    example: {
      endpoint: {
        url: 'http://localhost:3000/:param3',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer <token>',
        },
      },
      // ... other mapping fields
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class WarehouseConfigResponseDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsString()
  warehouse_id: string;

  @ApiProperty({ description: 'Warehouse name' })
  @IsString()
  warehouse_name: string;

  @ApiProperty({ description: 'Create task configuration', required: false })
  @IsOptional()
  @IsObject()
  create_task_config?: any;

  @ApiProperty({ description: 'Update task configuration', required: false })
  @IsOptional()
  @IsObject()
  update_task_config?: any;

  @ApiProperty({ description: 'Cancel task configuration', required: false })
  @IsOptional()
  @IsObject()
  cancel_task_config?: any;

  @ApiProperty({ description: 'Get location configuration', required: false })
  @IsOptional()
  @IsObject()
  get_location_config?: any;
}

export class WarehouseConfigUpdateResponseDto {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Sample data for robot-job API' })
  @IsObject()
  sample_data: any;
}
