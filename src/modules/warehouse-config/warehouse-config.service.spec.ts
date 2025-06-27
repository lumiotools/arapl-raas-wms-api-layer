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
  let repository: Repository<Warehouse>;

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

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
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
    repository = module.get<Repository<Warehouse>>(
      getRepositoryToken(Warehouse),
    );
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
      const configDto: CreateTaskConfigDto = {
        config: { object_type: 'object', test_field: 'test_value' },
      };

      mockRepository.findOne.mockResolvedValue(mockWarehouse);
      mockRepository.save.mockResolvedValue({
        ...mockWarehouse,
        create_task_config: configDto.config,
      });

      const result = await service.updateCreateTaskConfig(
        warehouseId,
        configDto,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        create_task_config: configDto.config,
      });
      expect(result.create_task_config).toEqual(configDto.config);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configDto: CreateTaskConfigDto = {
        config: { object_type: 'object', test_field: 'test_value' },
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCreateTaskConfig(warehouseId, configDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUpdateTaskConfig', () => {
    it('should update update task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: UpdateTaskConfigDto = {
        config: { object_type: 'object', update_field: 'update_value' },
      };

      mockRepository.findOne.mockResolvedValue(mockWarehouse);
      mockRepository.save.mockResolvedValue({
        ...mockWarehouse,
        update_task_config: configDto.config,
      });

      const result = await service.updateUpdateTaskConfig(
        warehouseId,
        configDto,
      );

      expect(result.update_task_config).toEqual(configDto.config);
    });
  });

  describe('updateCancelTaskConfig', () => {
    it('should update cancel task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: CancelTaskConfigDto = {
        config: { object_type: 'object', cancel_field: 'cancel_value' },
      };

      mockRepository.findOne.mockResolvedValue(mockWarehouse);
      mockRepository.save.mockResolvedValue({
        ...mockWarehouse,
        cancel_task_config: configDto.config,
      });

      const result = await service.updateCancelTaskConfig(
        warehouseId,
        configDto,
      );

      expect(result.cancel_task_config).toEqual(configDto.config);
    });
  });

  describe('updateGetLocationConfig', () => {
    it('should update get location config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configDto: GetLocationConfigDto = {
        config: { object_type: 'object', location_field: 'location_value' },
      };

      mockRepository.findOne.mockResolvedValue(mockWarehouse);
      mockRepository.save.mockResolvedValue({
        ...mockWarehouse,
        get_location_config: configDto.config,
      });

      const result = await service.updateGetLocationConfig(
        warehouseId,
        configDto,
      );

      expect(result.get_location_config).toEqual(configDto.config);
    });
  });

  describe('getWarehouseConfig', () => {
    it('should return warehouse config successfully', async () => {
      const warehouseId = 'test-warehouse-1';

      mockRepository.findOne.mockResolvedValue(mockWarehouse);

      const result = await service.getWarehouseConfig(warehouseId);

      expect(result.warehouse_id).toEqual(mockWarehouse.warehouse_id);
      expect(result.warehouse_name).toEqual(mockWarehouse.warehouse_name);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getWarehouseConfig(warehouseId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
