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
    description:
      'Configuration mapping for create task operations. Must be a valid transformation config that produces TaskGenerationReq structure.',
    example: {
      object_type: 'object',
      batch_job_id: {
        object_type: 'string',
        path: 'input.job_id',
        default: 'DEFAULT_BATCH',
      },
      batch_priority: {
        object_type: 'number',
        path: 'input.priority',
        default: 1,
      },
      batch_type: {
        object_type: 'string',
        path: 'input.type',
        default: 'Discrete',
      },
      batch_frequency: {
        object_type: 'number',
        path: 'input.frequency',
        default: 1,
      },
      tasks: {
        object_type: 'array',
        source: 'input.operations',
        map: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'id' },
          task_type: {
            object_type: 'string',
            path: 'kind',
            default: 'CrossDocking',
          },
          start_location: {
            object_type: 'object',
            location_id: { object_type: 'string', path: 'start.id' },
            location_action: {
              object_type: 'string',
              path: 'start.action',
              default: 'Pick',
            },
          },
          end_location: {
            object_type: 'object',
            location_id: { object_type: 'string', path: 'end.id' },
            location_action: {
              object_type: 'string',
              path: 'end.action',
              default: 'Drop',
            },
          },
          cargos: {
            object_type: 'array',
            source: 'items',
            map: {
              object_type: 'object',
              cargo_code: { object_type: 'string', path: 'code' },
              cargo_type: {
                object_type: 'string',
                path: 'type',
                default: 'Standard',
              },
            },
          },
        },
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class UpdateTaskConfigDto {
  @ApiProperty({
    description:
      'Configuration mapping for update task operations. Must be a valid transformation config that produces TaskUpdateReq structure.',
    example: {
      object_type: 'object',
      batch_job_id: {
        object_type: 'string',
        path: 'input.job_id',
      },
      updates: {
        object_type: 'array',
        source: 'input.task_updates',
        map: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'id' },
          start_location: {
            object_type: 'object',
            location_id: { object_type: 'string', path: 'start_loc.id' },
          },
          end_location: {
            object_type: 'object',
            location_id: { object_type: 'string', path: 'end_loc.id' },
          },
          cargos: {
            object_type: 'array',
            source: 'cargo_list',
            map: {
              object_type: 'object',
              cargo_code: { object_type: 'string', path: 'code' },
            },
          },
        },
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class CancelTaskConfigDto {
  @ApiProperty({
    description:
      'Configuration mapping for cancel task operations. Must be a valid transformation config that produces CancelReq structure.',
    example: {
      object_type: 'object',
      reason: {
        object_type: 'string',
        path: 'input.cancellation_reason',
        default: 'User requested cancellation',
      },
      timestamp: {
        object_type: 'string',
        path: 'input.cancellation_timestamp',
        default: new Date().toISOString(),
      },
    },
  })
  @IsObject()
  @IsNotEmpty()
  config: any;
}

export class GetLocationConfigDto {
  @ApiProperty({
    description:
      'Configuration mapping for get location operations. Must include valid endpoint configuration.',
    example: {
      endpoint: {
        url: 'http://localhost:3000/api/locations/:warehouse_id',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer <token>',
        },
      },
      request_mapping: {
        object_type: 'object',
        warehouse_id: { object_type: 'string', path: 'input.warehouse_id' },
        filters: { object_type: 'object', path: 'input.filters' },
      },
      response_mapping: {
        object_type: 'array',
        source: 'response.locations',
        map: {
          object_type: 'object',
          location_id: { object_type: 'string', path: 'id' },
          status: { object_type: 'string', path: 'status' },
        },
      },
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
