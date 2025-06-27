import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { WarehouseConfigService } from './warehouse-config.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
} from './dto/warehouse-config.dto';

describe('WarehouseConfigService', () => {
  let service: WarehouseConfigService;
  let mockWarehouseRepository: jest.Mocked<Repository<Warehouse>>;

  const mockWarehouse = {
    warehouse_id: 'test-warehouse-1',
    warehouse_name: 'Test Warehouse',
    api_key: 'test-api-key',
    locations_customer_managed: false,
    webhook_url: null,
    create_task_config: null,
    update_task_config: null,
    cancel_task_config: null,
    get_location_config: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehouseConfigService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<WarehouseConfigService>(WarehouseConfigService);
    mockWarehouseRepository = module.get(getRepositoryToken(Warehouse));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateCreateTaskConfig', () => {
    it('should update create task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configData = {
        config: {
          object_type: 'object',
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
          batch_priority: {
            object_type: 'number',
            path: 'input.batch_priority',
            default: 5,
          },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateCreateTaskConfig(
        warehouseId,
        configData,
      );

      expect(mockWarehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(mockWarehouseRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        create_task_config: configData.config,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Create task configuration updated successfully',
      );
      expect(result.sample_data).toEqual({
        job_id: 'sample_string',
        batch_priority: 5,
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCreateTaskConfig(warehouseId, configData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUpdateTaskConfig', () => {
    it('should update update task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configData = {
        config: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'input.task_id' },
          status: { object_type: 'string', path: 'input.status' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateUpdateTaskConfig(
        warehouseId,
        configData,
      );

      expect(mockWarehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(mockWarehouseRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        update_task_config: configData.config,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Update task configuration updated successfully',
      );
      expect(result.sample_data).toEqual({
        task_id: 'sample_string',
        status: 'sample_string',
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'input.task_id' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateUpdateTaskConfig(warehouseId, configData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCancelTaskConfig', () => {
    it('should update cancel task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configData = {
        config: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'input.task_id' },
          reason: { object_type: 'string', path: 'input.reason' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateCancelTaskConfig(
        warehouseId,
        configData,
      );

      expect(mockWarehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(mockWarehouseRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        cancel_task_config: configData.config,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Cancel task configuration updated successfully',
      );
      expect(result.sample_data).toEqual({
        task_id: 'sample_string',
        reason: 'sample_string',
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          task_id: { object_type: 'string', path: 'input.task_id' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCancelTaskConfig(warehouseId, configData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGetLocationConfig', () => {
    it('should update get location config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configData = {
        config: {
          object_type: 'object',
          location_type: { object_type: 'string', path: 'input.location_type' },
          available: { object_type: 'boolean', path: 'input.available' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateGetLocationConfig(
        warehouseId,
        configData,
      );

      expect(mockWarehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(mockWarehouseRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        get_location_config: configData.config,
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Get location configuration updated successfully',
      );
      expect(result.sample_data).toEqual({
        location_type: 'sample_string',
        available: true,
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          location_type: { object_type: 'string', path: 'input.location_type' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateGetLocationConfig(warehouseId, configData),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getWarehouseConfig', () => {
    it('should return warehouse config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const warehouseWithConfig = {
        ...mockWarehouse,
        create_task_config: { test: 'config' },
        update_task_config: { test: 'config' },
        cancel_task_config: { test: 'config' },
        get_location_config: { test: 'config' },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        warehouseWithConfig as Warehouse,
      );

      const result = await service.getWarehouseConfig(warehouseId);

      expect(mockWarehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(result).toEqual({
        warehouse_id: 'test-warehouse-1',
        warehouse_name: 'Test Warehouse',
        create_task_config: { test: 'config' },
        update_task_config: { test: 'config' },
        cancel_task_config: { test: 'config' },
        get_location_config: { test: 'config' },
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(service.getWarehouseConfig(warehouseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('complex config scenarios', () => {
    it('should handle complex nested config with arrays', async () => {
      const warehouseId = 'test-warehouse-1';
      const complexConfig = {
        config: {
          object_type: 'object',
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
          batch_priority: {
            object_type: 'number',
            path: 'input.batch_priority',
            default: 5,
          },
          tasks: {
            object_type: 'array',
            source: 'input.task',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'op.task_id' },
              task_type: { object_type: 'string', path: 'op.task_type' },
            },
          },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateCreateTaskConfig(
        warehouseId,
        complexConfig,
      );

      expect(result.success).toBe(true);
      expect(result.sample_data).toEqual({
        job_id: 'sample_string',
        batch_priority: 5,
        task: [
          {
            task_id: 'sample_string',
            task_type: 'sample_string',
          },
        ],
      });
    });

    it('should handle null and default values correctly', async () => {
      const warehouseId = 'test-warehouse-1';
      const configWithNulls = {
        config: {
          object_type: 'object',
          task_dependency: {
            object_type: 'null',
            path: 'input.task_dependency',
          },
          priority: {
            object_type: 'number',
            path: 'input.priority',
            default: 10,
          },
          active: {
            object_type: 'boolean',
            path: 'input.active',
            default: true,
          },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );
      mockWarehouseRepository.save.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      const result = await service.updateCreateTaskConfig(
        warehouseId,
        configWithNulls,
      );

      expect(result.success).toBe(true);
      expect(result.sample_data).toEqual({
        task_dependency: null,
        priority: 10,
        active: true,
      });
    });
  });
});
