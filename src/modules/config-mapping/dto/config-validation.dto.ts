import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

// Base config field DTO
export class ConfigFieldDto {
  @IsString()
  object_type: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  default?: any;
}

// Primitive type config DTOs
export class StringConfigDto extends ConfigFieldDto {
  declare object_type: 'string';
}

export class NumberConfigDto extends ConfigFieldDto {
  declare object_type: 'number';
}

export class BooleanConfigDto extends ConfigFieldDto {
  declare object_type: 'boolean';
}

export class NullConfigDto extends ConfigFieldDto {
  declare object_type: 'null';
}

// Array config DTO
export class ArrayConfigDto extends ConfigFieldDto {
  declare object_type: 'array';

  @IsString()
  source: string;

  @ValidateNested()
  @Type(() => Object)
  map: any; // This will be validated recursively
}

// Location dimension DTO
export class LocationDimensionConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => NumberConfigDto)
  length: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  width: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  height: NumberConfigDto;
}

// Location attribute DTO
export class LocationAttributeConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Location DTO
export class LocationConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_action: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  location_type: StringConfigDto;

  @ValidateNested()
  @Type(() => LocationDimensionConfigDto)
  location_dimension: LocationDimensionConfigDto;

  @ValidateNested()
  @Type(() => LocationAttributeConfigDto)
  location_attribute: LocationAttributeConfigDto;
}

// Cargo dimension DTO
export class CargoDimensionConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => NumberConfigDto)
  length: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  width: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  height: NumberConfigDto;
}

// Cargo attributes DTO
export class CargoAttributesConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_name: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  attribute_value: StringConfigDto;
}

// Cargo DTO
export class CargoConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_code: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  cargo_type: StringConfigDto;

  @ValidateNested()
  @Type(() => CargoDimensionConfigDto)
  cargo_dimension: CargoDimensionConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  cargo_weight: NumberConfigDto;

  @ValidateNested()
  @Type(() => CargoAttributesConfigDto)
  cargo_attributes: CargoAttributesConfigDto;
}

// Wait configuration DTO
export class WaitConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_type: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_condition: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  start_location_wait_time: NumberConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  end_location_wait_time: NumberConfigDto;

  @ValidateNested()
  @Type(() => BooleanConfigDto)
  start_location_available_wait: BooleanConfigDto;

  @ValidateNested()
  @Type(() => BooleanConfigDto)
  end_location_available_wait: BooleanConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  wait_status: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  timeout: NumberConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  fallback_action: StringConfigDto;
}

// Task DTO for create task
export class CreateTaskConfigDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  task_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  task_type: StringConfigDto;

  @ValidateNested()
  @Type(() => NullConfigDto)
  task_dependency: NullConfigDto;

  @ValidateNested()
  @Type(() => LocationConfigDto)
  start_location: LocationConfigDto;

  @ValidateNested()
  @Type(() => LocationConfigDto)
  end_location: LocationConfigDto;

  @ValidateNested()
  @Type(() => WaitConfigDto)
  wait: WaitConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  cargos: ArrayConfigDto;
}

// Create Task Configuration DTO
export class CreateTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_job_id: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  batch_priority: NumberConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_type: StringConfigDto;

  @ValidateNested()
  @Type(() => NumberConfigDto)
  batch_frequency: NumberConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  tasks: ArrayConfigDto;
}

// Update Task Configuration DTO
export class UpdateTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  batch_job_id: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;

  @ValidateNested()
  @Type(() => ArrayConfigDto)
  updates: ArrayConfigDto;
}

// Cancel Task Configuration DTO
export class CancelTaskValidationDto {
  @IsString()
  object_type: 'object';

  @ValidateNested()
  @Type(() => StringConfigDto)
  reason: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;
}

// Get Location Configuration DTO
export class GetLocationValidationDto {
  @ValidateNested()
  @Type(() => Object)
  endpoint: any;

  @ValidateNested()
  @Type(() => Object)
  request: any;

  @ValidateNested()
  @Type(() => Object)
  response: any;
}

// Reference configurations
export const CREATE_TASK_REFERENCE_CONFIG: CreateTaskValidationDto = {
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
          cargo_weight: { object_type: 'number', path: 'item.cargo_weight' },
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
};

export const UPDATE_TASK_REFERENCE_CONFIG: UpdateTaskValidationDto = {
  object_type: 'object',
  batch_job_id: { object_type: 'string', path: 'input.job_id' },
  timestamp: { object_type: 'string', path: 'input.update_timestamp' },
  updates: {
    object_type: 'array',
    source: 'input.tasks_to_update',
    map: {
      object_type: 'object',
      task_id: { object_type: 'string', path: 'op.id' },
      task_type: { object_type: 'string', path: 'op.type' },
      task_dependency: { object_type: 'string', path: 'op.depends_on' },
      start_location: {
        object_type: 'object',
        location_id: { object_type: 'string', path: 'op.source_location.id' },
        location_action: {
          object_type: 'string',
          path: 'op.source_location.action',
        },
        location_zone: { object_type: 'null', path: 'op.source_location.zone' },
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
        wait_type: { object_type: 'string', path: 'op.wait_config.type' },
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
          cargo_code: { object_type: 'string', path: 'item.code' },
          cargo_type: { object_type: 'string', path: 'item.type' },
          cargo_dimension: {
            object_type: 'object',
            length: { object_type: 'number', path: 'item.dimensions.len' },
            width: { object_type: 'number', path: 'item.dimensions.wid' },
            height: { object_type: 'number', path: 'item.dimensions.ht' },
          },
          cargo_weight: { object_type: 'number', path: 'item.weight' },
        },
      },
    },
  },
};

export const CANCEL_TASK_REFERENCE_CONFIG: CancelTaskValidationDto = {
  object_type: 'object',
  reason: { object_type: 'string', path: 'input.cancellation_reason' },
  timestamp: { object_type: 'string', path: 'input.cancellation_timestamp' },
};

export const GET_LOCATION_REFERENCE_CONFIG: GetLocationValidationDto = {
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
      location_limit: { object_type: 'number', path: 'input.location_limit' },
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
          location_type: { object_type: 'string', path: 'loc.location_type' },
          cargo_quantity: { object_type: 'number', path: 'loc.cargo_quantity' },
        },
      },
    },
  },
};
