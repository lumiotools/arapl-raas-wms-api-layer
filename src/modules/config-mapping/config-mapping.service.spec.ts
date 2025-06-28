import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfigMappingService } from './config-mapping.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { Validator } from 'class-validator';

describe('ConfigMappingService', () => {
  let service: ConfigMappingService;
  let mockWarehouseRepository: jest.Mocked<Repository<Warehouse>>;
  let mockValidator: jest.Mocked<Validator>;

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockValidatorInstance = {
      validate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigMappingService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockRepository,
        },
        {
          provide: Validator,
          useValue: mockValidatorInstance,
        },
      ],
    }).compile();

    service = module.get<ConfigMappingService>(ConfigMappingService);
    mockWarehouseRepository = module.get(getRepositoryToken(Warehouse));
    mockValidator = module.get(Validator);
  });

  describe('validateCreateTaskConfig', () => {
    it('should throw BadRequestException for invalid config with wrong field names', async () => {
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

      // Mock validator to return validation errors
      mockValidator.validate.mockResolvedValue([
        {
          property: 'bat_priority',
          constraints: {
            forbidNonWhitelisted: 'property bat_priority should not exist',
          },
        },
        {
          property: 'tsk',
          constraints: {
            forbidNonWhitelisted: 'property tsk should not exist',
          },
        },
      ]);

      await expect(
        service['validateCreateTaskConfig'](invalidConfig),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw for valid config', async () => {
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
          },
        },
      };

      // Mock validator to return no errors
      mockValidator.validate.mockResolvedValue([]);

      await expect(
        service['validateCreateTaskConfig'](validConfig),
      ).resolves.not.toThrow();
    });
  });
});
