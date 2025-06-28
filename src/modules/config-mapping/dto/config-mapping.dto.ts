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
      batch_job_id: { object_type: 'string', path: 'input.job_id' },
      batch_priority: {
        object_type: 'number',
        path: 'input.batch_priority',
        default: 5,
      },
      batch_type: {
        object_type: 'string',
        path: 'input.batch_type',
        default: 'Discrete',
      },
      batch_frequency: { object_type: 'number', path: 'input.batch_frequency' },
      tasks: {
        object_type: 'array',
        source: 'input.task',
        map: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'op.task_id' },
          task_type: { object_type: 'string', path: 'op.task_type' },
          task_dependency: { object_type: 'null', path: 'op.task_dependency' },

          start_location: {
            object_type: 'object',
            location_id: {
              object_type: 'string',
              path: 'op.start_location.location_id',
            },
            location_action: {
              object_type: 'string',
              path: 'op.start_location.location_action',
            },
            location_type: {
              object_type: 'string',
              path: 'op.start_location.location_type',
              default: 'Pallet',
            },
            location_dimension: {
              object_type: 'object',
              length: {
                object_type: 'number',
                path: 'op.start_location.location_dimension.length',
              },
              width: {
                object_type: 'number',
                path: 'op.start_location.location_dimension.width',
              },
              height: {
                object_type: 'number',
                path: 'op.start_location.location_dimension.height',
              },
            },
            location_attribute: {
              object_type: 'object',
              attribute_name: {
                object_type: 'string',
                path: 'op.start_location.location_attribute.attribute_name',
              },
              attribute_value: {
                object_type: 'string',
                path: 'op.start_location.location_attribute.attribute_value',
              },
            },
          },

          end_location: {
            object_type: 'object',
            location_id: {
              object_type: 'string',
              path: 'op.end_location.location_id',
            },
            location_action: {
              object_type: 'string',
              path: 'op.end_location.location_action',
            },
            location_type: {
              object_type: 'string',
              path: 'op.end_location.location_type',
            },
            location_dimension: {
              object_type: 'object',
              length: {
                object_type: 'number',
                path: 'op.end_location.location_dimension.length',
              },
              width: {
                object_type: 'number',
                path: 'op.end_location.location_dimension.width',
              },
              height: {
                object_type: 'number',
                path: 'op.end_location.location_dimension.height',
              },
            },
            location_attribute: {
              object_type: 'null',
              attribute_name: {
                object_type: 'string',
                path: 'op.end_location.location_attribute.attribute_name',
              },
              attribute_value: {
                object_type: 'string',
                path: 'op.end_location.location_attribute.attribute_value',
              },
            },
          },
          wait: {
            object_type: 'null',
            wait_type: { object_type: 'string', path: 'op.wait.wait_type' },
            wait_condition: {
              object_type: 'string',
              path: 'op.wait.wait_condition',
            },
            start_location_wait_time: {
              object_type: 'number',
              path: 'op.wait.start_location_wait_time',
              default: 0,
            },
            end_location_wait_time: {
              object_type: 'number',
              path: 'op.wait.end_location_wait_time',
              default: 0,
            },
            start_location_available_wait: {
              object_type: 'boolean',
              path: 'op.wait.start_location_available_wait',
              default: false,
            },
            end_location_available_wait: {
              object_type: 'boolean',
              path: 'op.wait.end_location_available_wait',
              default: false,
            },
            wait_status: {
              object_type: 'string',
              path: 'op.wait.wait_status',
              default: 'Not Started',
            },
            timeout: {
              object_type: 'number',
              path: 'op.wait.timeout',
              default: 1800,
            },
            fallback_action: {
              object_type: 'string',
              path: 'op.wait.fallback_action',
              default: 'Error',
            },
          },
          cargos: {
            object_type: 'array',
            source: 'op.cargos',
            map: {
              object_type: 'object',
              cargo_code: { object_type: 'string', path: 'item.cargo_code' },
              cargo_type: { object_type: 'string', path: 'item.cargo_type' },
              cargo_dimension: {
                object_type: 'object',
                length: {
                  object_type: 'number',
                  path: 'item.cargo_dimension.length',
                },
                width: {
                  object_type: 'number',
                  path: 'item.cargo_dimension.width',
                },
                height: {
                  object_type: 'number',
                  path: 'item.cargo_dimension.height',
                },
              },
              cargo_weight: {
                object_type: 'number',
                path: 'item.cargo_weight',
              },
              cargo_attributes: {
                object_type: 'object',
                attribute_name: {
                  object_type: 'string',
                  path: 'item.cargo_attributes.attribute_name',
                },
                attribute_value: {
                  object_type: 'string',
                  path: 'item.cargo_attributes.attribute_value',
                },
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
      timestamp: {
        object_type: 'string',
        path: 'input.update_timestamp',
      },
      updates: {
        object_type: 'array',
        source: 'input.tasks_to_update',
        map: {
          object_type: 'object',
          task_id: {
            object_type: 'string',
            path: 'op.id',
          },
          task_type: {
            object_type: 'string',
            path: 'op.type',
          },
          task_dependency: {
            object_type: 'string',
            path: 'op.depends_on',
          },
          start_location: {
            object_type: 'object',
            location_id: {
              object_type: 'string',
              path: 'op.source_location.id',
            },
            location_action: {
              object_type: 'string',
              path: 'op.source_location.action',
            },
            location_zone: {
              object_type: 'null',
              path: 'op.source_location.zone',
            },
            location_dimension: {
              object_type: 'object',
              length: {
                object_type: 'number',
                path: 'op.source_location.dimensions.len',
              },
              width: {
                object_type: 'number',
                path: 'op.source_location.dimensions.wid',
              },
              height: {
                object_type: 'number',
                path: 'op.source_location.dimensions.ht',
              },
            },
          },
          end_location: {
            object_type: 'object',
            location_id: {
              object_type: 'string',
              path: 'op.destination_location.id',
            },
            location_action: {
              object_type: 'string',
              path: 'op.destination_location.action',
            },
            location_zone: {
              object_type: 'null',
              path: 'op.destination_location.zone',
            },
            location_dimension: {
              object_type: 'object',
              length: {
                object_type: 'number',
                path: 'op.destination_location.dimensions.len',
              },
              width: {
                object_type: 'number',
                path: 'op.destination_location.dimensions.wid',
              },
              height: {
                object_type: 'number',
                path: 'op.destination_location.dimensions.ht',
              },
            },
          },
          wait_time: {
            object_type: 'null',
            wait_type: {
              object_type: 'string',
              path: 'op.wait_config.type',
            },
            start_location_wait_time: {
              object_type: 'number',
              path: 'op.wait_config.source_wait',
            },
            end_location_wait_time: {
              object_type: 'number',
              path: 'op.wait_config.destination_wait',
            },
          },

          cargos: {
            object_type: 'array',
            source: 'op.cargos',
            map: {
              object_type: 'object',
              cargo_code: {
                object_type: 'string',
                path: 'item.code',
              },
              cargo_type: {
                object_type: 'string',
                path: 'item.type',
              },
              cargo_dimension: {
                object_type: 'object',
                length: {
                  object_type: 'number',
                  path: 'item.dimensions.len',
                },
                width: {
                  object_type: 'number',
                  path: 'item.dimensions.wid',
                },
                height: {
                  object_type: 'number',
                  path: 'item.dimensions.ht',
                },
              },
              cargo_weight: {
                object_type: 'number',
                path: 'item.weight',
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

export class CancelTaskConfigDto {
  @ApiProperty({
    description:
      'Configuration mapping for cancel task operations. Must be a valid transformation config that produces CancelReq structure.',
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
    description:
      'Configuration mapping for get location operations. Must include valid endpoint configuration.',
    example: {
      endpoint: {
        url: 'http://localhost:3000/:param3',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer <token>',
        },
      },
      request: {
        body: {
          object_type: 'object',
          location_status: {
            object_type: 'string',
            path: 'input.location_status',
            default: 'All',
          },
          location_zone: { object_type: 'string', path: 'input.location_zone' },
          location_type: { object_type: 'string', path: 'input.location_type' },
          location_level: {
            object_type: 'string',
            path: 'input.location_level',
            default: 'All',
          },
          location_limit: {
            object_type: 'number',
            path: 'input.location_limit',
          },
        },
        query_params: {
          param1: 'input.zone_id',
          param2: 'null',
        },
        path_params: {
          param3: 'input.zones[1].id',
        },
      },
      response: {
        body: {
          object_type: 'object',
          zone_id: { object_type: 'string', path: 'input.zones[1].id' },
          available_locations: {
            object_type: 'array',
            source: 'input.available_locations',
            map: {
              object_type: 'object',
              location_id: { object_type: 'string', path: 'loc.location_id' },
              location_dimension: {
                object_type: 'object',
                lenght: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'loc.dimension.Len.length',
                  },
                },
                width: {
                  object_type: 'object',
                  width: {
                    object_type: 'number',
                    path: 'loc.dimension.Width.width',
                  },
                },
                height: {
                  object_type: 'object',
                  height: {
                    object_type: 'number',
                    path: 'loc.dimension.Height.height',
                  },
                },
              },
              location_type: {
                object_type: 'string',
                path: 'loc.location_type',
              },
              cargo_quantity: {
                object_type: 'number',
                path: 'loc.cargo_quantity',
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

export class ConfigMappingResponseDto {
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

export class ConfigMappingUpdateResponseDto {
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

export class DeleteConfigDto {
  @ApiProperty({
    description: 'Type of configuration to delete',
    example: 'create_task',
    enum: ['create_task', 'update_task', 'cancel_task', 'get_location'],
  })
  @IsString()
  @IsNotEmpty()
  config_type: 'create_task' | 'update_task' | 'cancel_task' | 'get_location';
}

export class DeleteConfigResponseDto {
  @ApiProperty({ description: 'Success status' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: 'Success message' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Deleted configuration type' })
  @IsString()
  deleted_config_type: string;
}

// Error Response DTOs
export class ConfigMappingBadRequestDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Invalid configuration - validation failed' })
  message: string;
}

export class ConfigMappingUnauthorizedDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Unauthorized' })
  error: string;

  @ApiProperty({ example: 'Missing or invalid authentication token.' })
  message: string;
}

export class ConfigMappingNotFoundDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({ example: "Warehouse with ID 'WH_001' not found." })
  message: string;
}

export class ConfigMappingInternalServerErrorDto {
  @ApiProperty({ example: 500 })
  statusCode: number;

  @ApiProperty({ example: 'Internal Server Error' })
  error: string;

  @ApiProperty({
    example: 'An unexpected error occurred while processing the configuration.',
  })
  message: string;
}
