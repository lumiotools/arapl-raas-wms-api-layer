import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  CreateTaskValidationDto,
  UpdateTaskValidationDto,
  CancelTaskValidationDto,
  GetLocationValidationDto,
} from './config-validation.dto';

describe('ConfigValidationDto', () => {
  describe('Create Task Validation', () => {
    it('should validate correct create task config structure', async () => {
      const validConfig = {
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
        batch_frequency: {
          object_type: 'number',
          path: 'input.batch_frequency',
        },
        tasks: {
          object_type: 'array',
          source: 'input.task',
          map: {
            object_type: 'object',
            task_id: { object_type: 'string', path: 'op.task_id' },
            task_type: { object_type: 'string', path: 'op.task_type' },
            task_dependency: {
              object_type: 'null',
              path: 'op.task_dependency',
            },
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
      };

      const structuredDto = plainToInstance(
        CreateTaskValidationDto,
        validConfig,
      );
      const errors = await validate(structuredDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });

      expect(errors).toHaveLength(0);
    });

    it('should reject config with wrong field names', async () => {
      const invalidConfig = {
        object_type: 'object',
        batch_job_id: { object_type: 'string', path: 'input.job_id' },
        bat_priority: {
          object_type: 'number',
          path: 'input.batch_priority',
          default: 5,
        }, // Wrong field name
        batch_type: {
          object_type: 'string',
          path: 'input.batch_type',
          default: 'Discrete',
        },
        batch_frequency: {
          object_type: 'number',
          path: 'input.batch_frequency',
        },
        tsk: {
          // Wrong field name
          object_type: 'array',
          source: 'input.task',
          map: {
            object_type: 'object',
            task_id: { object_type: 'string', path: 'op.task_id' },
          },
        },
      };

      const structuredDto = plainToInstance(
        CreateTaskValidationDto,
        invalidConfig,
      );
      const errors = await validate(structuredDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });

      expect(errors.length).toBeGreaterThan(0);

      // Check that we have errors for unknown properties
      const unknownPropertyErrors = errors.filter(
        (error) =>
          error.constraints && error.constraints['forbidNonWhitelisted'],
      );
      expect(unknownPropertyErrors.length).toBeGreaterThan(0);
    });

    it('should reject config with missing required fields', async () => {
      const invalidConfig = {
        object_type: 'object',
        batch_job_id: { object_type: 'string', path: 'input.job_id' },
        // Missing batch_priority, batch_type, batch_frequency, tasks
      };

      const structuredDto = plainToInstance(
        CreateTaskValidationDto,
        invalidConfig,
      );
      const errors = await validate(structuredDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
      });

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
