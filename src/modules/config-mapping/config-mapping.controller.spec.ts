import { Test, TestingModule } from '@nestjs/testing';
import { ConfigMappingController } from './config-mapping.controller';
import { ConfigMappingService } from './config-mapping.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  ConfigMappingResponseDto,
  ConfigMappingUpdateResponseDto,
} from './dto/config-mapping.dto';

describe('ConfigMappingController', () => {
  let controller: ConfigMappingController;
  let service: ConfigMappingService;

  const mockConfigMapping: ConfigMappingResponseDto = {
    warehouse_id: 'WH_001',
    warehouse_name: 'Test Warehouse',
    create_task_config: { test: 'config' },
    update_task_config: { test: 'config' },
    cancel_task_config: { test: 'config' },
    get_location_config: { test: 'config' },
  };

  const mockCreateTaskResponse: ConfigMappingUpdateResponseDto = {
    success: true,
    message: 'Create task configuration updated successfully',
    sample_data: { test: 'sample' },
  };

  const mockUpdateTaskResponse: ConfigMappingUpdateResponseDto = {
    success: true,
    message: 'Update task configuration updated successfully',
    sample_data: { test: 'sample' },
  };

  const mockCancelTaskResponse: ConfigMappingUpdateResponseDto = {
    success: true,
    message: 'Cancel task configuration updated successfully',
    sample_data: { test: 'sample' },
  };

  const mockGetLocationResponse: ConfigMappingUpdateResponseDto = {
    success: true,
    message: 'Get location configuration updated successfully',
    sample_data: { test: 'sample' },
  };

  const mockConfigMappingService = {
    updateCreateTaskConfig: jest.fn(),
    updateUpdateTaskConfig: jest.fn(),
    updateCancelTaskConfig: jest.fn(),
    updateGetLocationConfig: jest.fn(),
    getConfigMapping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfigMappingController],
      providers: [
        {
          provide: ConfigMappingService,
          useValue: mockConfigMappingService,
        },
      ],
    }).compile();

    controller = module.get<ConfigMappingController>(ConfigMappingController);
    service = module.get<ConfigMappingService>(ConfigMappingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateCreateTaskConfig', () => {
    it('should update create task configuration successfully', async () => {
      const warehouseId = 'WH_001';
      const createTaskConfigDto: CreateTaskConfigDto = {
        config: { object_type: 'object', test: 'config' },
      };

      mockConfigMappingService.updateCreateTaskConfig.mockResolvedValue(
        mockCreateTaskResponse,
      );

      const result = await controller.updateCreateTaskConfig(
        warehouseId,
        createTaskConfigDto,
      );

      expect(service.updateCreateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        createTaskConfigDto,
      );
      expect(result).toEqual(mockCreateTaskResponse);
    });
  });

  describe('updateUpdateTaskConfig', () => {
    it('should update update task configuration successfully', async () => {
      const warehouseId = 'WH_001';
      const updateTaskConfigDto: UpdateTaskConfigDto = {
        config: { object_type: 'object', test: 'config' },
      };

      mockConfigMappingService.updateUpdateTaskConfig.mockResolvedValue(
        mockUpdateTaskResponse,
      );

      const result = await controller.updateUpdateTaskConfig(
        warehouseId,
        updateTaskConfigDto,
      );

      expect(service.updateUpdateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        updateTaskConfigDto,
      );
      expect(result).toEqual(mockUpdateTaskResponse);
    });
  });

  describe('updateCancelTaskConfig', () => {
    it('should update cancel task configuration successfully', async () => {
      const warehouseId = 'WH_001';
      const cancelTaskConfigDto: CancelTaskConfigDto = {
        config: { object_type: 'object', test: 'config' },
      };

      mockConfigMappingService.updateCancelTaskConfig.mockResolvedValue(
        mockCancelTaskResponse,
      );

      const result = await controller.updateCancelTaskConfig(
        warehouseId,
        cancelTaskConfigDto,
      );

      expect(service.updateCancelTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        cancelTaskConfigDto,
      );
      expect(result).toEqual(mockCancelTaskResponse);
    });
  });

  describe('updateGetLocationConfig', () => {
    it('should update get location configuration successfully', async () => {
      const warehouseId = 'WH_001';
      const getLocationConfigDto: GetLocationConfigDto = {
        config: { object_type: 'object', test: 'config' },
      };

      mockConfigMappingService.updateGetLocationConfig.mockResolvedValue(
        mockGetLocationResponse,
      );

      const result = await controller.updateGetLocationConfig(
        warehouseId,
        getLocationConfigDto,
      );

      expect(service.updateGetLocationConfig).toHaveBeenCalledWith(
        warehouseId,
        getLocationConfigDto,
      );
      expect(result).toEqual(mockGetLocationResponse);
    });
  });

  describe('getConfigMapping', () => {
    it('should return configuration mapping successfully', async () => {
      const warehouseId = 'WH_001';

      mockConfigMappingService.getConfigMapping.mockResolvedValue(
        mockConfigMapping,
      );

      const result = await controller.getConfigMapping(warehouseId);

      expect(service.getConfigMapping).toHaveBeenCalledWith(warehouseId);
      expect(result).toEqual(mockConfigMapping);
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

      mockConfigMappingService.updateCreateTaskConfig.mockResolvedValue(
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

      mockConfigMappingService.updateCreateTaskConfig.mockResolvedValue(
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
