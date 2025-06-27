import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseConfigController } from './warehouse-config.controller';
import { WarehouseConfigService } from './warehouse-config.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  WarehouseConfigResponseDto,
  WarehouseConfigUpdateResponseDto,
} from './dto/warehouse-config.dto';

describe('WarehouseConfigController', () => {
  let controller: WarehouseConfigController;
  let service: WarehouseConfigService;

  const mockWarehouseConfig: WarehouseConfigResponseDto = {
    warehouse_id: 'test-warehouse-1',
    warehouse_name: 'Test Warehouse',
    create_task_config: null,
    update_task_config: null,
    cancel_task_config: null,
    get_location_config: null,
  };

  const mockCreateTaskResponse: WarehouseConfigUpdateResponseDto = {
    success: true,
    message: 'Create task configuration updated successfully',
    sample_data: {
      batch_job_id: 'sample_string',
      batch_priority: 5,
      tasks: [{ task_id: 'sample_string' }],
    },
  };

  const mockUpdateTaskResponse: WarehouseConfigUpdateResponseDto = {
    success: true,
    message: 'Update task configuration updated successfully',
    sample_data: {
      batch_job_id: 'sample_string',
      updates: [{ task_id: 'sample_string' }],
    },
  };

  const mockCancelTaskResponse: WarehouseConfigUpdateResponseDto = {
    success: true,
    message: 'Cancel task configuration updated successfully',
    sample_data: {
      reason: 'sample_string',
      timestamp: 'sample_string',
    },
  };

  const mockGetLocationResponse: WarehouseConfigUpdateResponseDto = {
    success: true,
    message: 'Get location configuration updated successfully',
    sample_data: {
      location_status: 'Available',
      location_zone: 'sample_string',
    },
  };

  const mockWarehouseConfigService = {
    updateCreateTaskConfig: jest.fn(),
    updateUpdateTaskConfig: jest.fn(),
    updateCancelTaskConfig: jest.fn(),
    updateGetLocationConfig: jest.fn(),
    getWarehouseConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WarehouseConfigController],
      providers: [
        {
          provide: WarehouseConfigService,
          useValue: mockWarehouseConfigService,
        },
      ],
    }).compile();

    controller = module.get<WarehouseConfigController>(
      WarehouseConfigController,
    );
    service = module.get<WarehouseConfigService>(WarehouseConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
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

      const expectedResponse = {
        success: true,
        message: 'Create task configuration updated successfully',
        sample_data: {
          job_id: 'sample_string',
          batch_priority: 5,
        },
      };

      mockWarehouseConfigService.updateCreateTaskConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateCreateTaskConfig(
        warehouseId,
        configData,
      );

      expect(service.updateCreateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configData,
      );
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        success: true,
        message: 'Update task configuration updated successfully',
        sample_data: {
          task_id: 'sample_string',
          status: 'sample_string',
        },
      };

      mockWarehouseConfigService.updateUpdateTaskConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateUpdateTaskConfig(
        warehouseId,
        configData,
      );

      expect(service.updateUpdateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configData,
      );
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        success: true,
        message: 'Cancel task configuration updated successfully',
        sample_data: {
          task_id: 'sample_string',
          reason: 'sample_string',
        },
      };

      mockWarehouseConfigService.updateCancelTaskConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateCancelTaskConfig(
        warehouseId,
        configData,
      );

      expect(service.updateCancelTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configData,
      );
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        success: true,
        message: 'Get location configuration updated successfully',
        sample_data: {
          location_type: 'sample_string',
          available: true,
        },
      };

      mockWarehouseConfigService.updateGetLocationConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateGetLocationConfig(
        warehouseId,
        configData,
      );

      expect(service.updateGetLocationConfig).toHaveBeenCalledWith(
        warehouseId,
        configData,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getWarehouseConfig', () => {
    it('should return warehouse config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const expectedResponse = {
        warehouse_id: 'test-warehouse-1',
        warehouse_name: 'Test Warehouse',
        create_task_config: { test: 'config' },
        update_task_config: { test: 'config' },
        cancel_task_config: { test: 'config' },
        get_location_config: { test: 'config' },
      };

      mockWarehouseConfigService.getWarehouseConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.getWarehouseConfig(warehouseId);

      expect(service.getWarehouseConfig).toHaveBeenCalledWith(warehouseId);
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        success: true,
        message: 'Create task configuration updated successfully',
        sample_data: {
          job_id: 'sample_string',
          batch_priority: 5,
          task: [
            {
              task_id: 'sample_string',
              task_type: 'sample_string',
            },
          ],
        },
      };

      mockWarehouseConfigService.updateCreateTaskConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateCreateTaskConfig(
        warehouseId,
        complexConfig,
      );

      expect(service.updateCreateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        complexConfig,
      );
      expect(result).toEqual(expectedResponse);
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

      const expectedResponse = {
        success: true,
        message: 'Create task configuration updated successfully',
        sample_data: {
          task_dependency: null,
          priority: 10,
          active: true,
        },
      };

      mockWarehouseConfigService.updateCreateTaskConfig.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.updateCreateTaskConfig(
        warehouseId,
        configWithNulls,
      );

      expect(service.updateCreateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configWithNulls,
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
