import { Test, TestingModule } from '@nestjs/testing';
import { WarehouseConfigController } from './warehouse-config.controller';
import { WarehouseConfigService } from './warehouse-config.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  WarehouseConfigResponseDto,
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

  const mockService = {
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
          useValue: mockService,
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
    it('should update create task config', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: CreateTaskConfigDto = {
        config: { object_type: 'object', test_field: 'test_value' },
      };

      mockService.updateCreateTaskConfig.mockResolvedValue(mockWarehouseConfig);

      const result = await controller.updateCreateTaskConfig(
        warehouseId,
        configDto,
      );

      expect(service.updateCreateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configDto,
      );
      expect(result).toEqual(mockWarehouseConfig);
    });
  });

  describe('updateUpdateTaskConfig', () => {
    it('should update update task config', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: UpdateTaskConfigDto = {
        config: { object_type: 'object', update_field: 'update_value' },
      };

      mockService.updateUpdateTaskConfig.mockResolvedValue(mockWarehouseConfig);

      const result = await controller.updateUpdateTaskConfig(
        warehouseId,
        configDto,
      );

      expect(service.updateUpdateTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configDto,
      );
      expect(result).toEqual(mockWarehouseConfig);
    });
  });

  describe('updateCancelTaskConfig', () => {
    it('should update cancel task config', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: CancelTaskConfigDto = {
        config: { object_type: 'object', cancel_field: 'cancel_value' },
      };

      mockService.updateCancelTaskConfig.mockResolvedValue(mockWarehouseConfig);

      const result = await controller.updateCancelTaskConfig(
        warehouseId,
        configDto,
      );

      expect(service.updateCancelTaskConfig).toHaveBeenCalledWith(
        warehouseId,
        configDto,
      );
      expect(result).toEqual(mockWarehouseConfig);
    });
  });

  describe('updateGetLocationConfig', () => {
    it('should update get location config', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: GetLocationConfigDto = {
        config: { object_type: 'object', location_field: 'location_value' },
      };

      mockService.updateGetLocationConfig.mockResolvedValue(
        mockWarehouseConfig,
      );

      const result = await controller.updateGetLocationConfig(
        warehouseId,
        configDto,
      );

      expect(service.updateGetLocationConfig).toHaveBeenCalledWith(
        warehouseId,
        configDto,
      );
      expect(result).toEqual(mockWarehouseConfig);
    });
  });

  describe('getWarehouseConfig', () => {
    it('should get warehouse config', async () => {
      const warehouseId = 'test-warehouse-1';

      mockService.getWarehouseConfig.mockResolvedValue(mockWarehouseConfig);

      const result = await controller.getWarehouseConfig(warehouseId);

      expect(service.getWarehouseConfig).toHaveBeenCalledWith(warehouseId);
      expect(result).toEqual(mockWarehouseConfig);
    });
  });
});
