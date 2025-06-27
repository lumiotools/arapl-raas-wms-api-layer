import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ConfigMappingService } from './config-mapping.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
} from './dto/config-mapping.dto';

describe('ConfigMappingService', () => {
  let service: ConfigMappingService;
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
        ConfigMappingService,
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ConfigMappingService>(ConfigMappingService);
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
                location_type: {
                  object_type: 'string',
                  path: 'start.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'start.action',
                  default: 'Pick',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'start.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'start.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'start.dimensions.height',
                    default: 10,
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: { object_type: 'string', path: 'end.id' },
                location_type: {
                  object_type: 'string',
                  path: 'end.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'end.action',
                  default: 'Drop',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'end.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'end.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'end.dimensions.height',
                    default: 10,
                  },
                },
              },
              cargos: {
                object_type: 'array',
                source: 'items',
                map: {
                  object_type: 'object',
                  cargo_code: { object_type: 'string', path: 'code' },
                },
              },
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
      expect(result.sample_data).toBeDefined();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          tasks: {
            object_type: 'array',
            source: 'input.operations',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'id' },
            },
          },
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
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
          updates: {
            object_type: 'array',
            source: 'input.task_updates',
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
                location_id: { object_type: 'string', path: 'start_loc.id' },
                location_type: {
                  object_type: 'string',
                  path: 'start_loc.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'start_loc.action',
                  default: 'Pick',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'start_loc.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'start_loc.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'start_loc.dimensions.height',
                    default: 10,
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: { object_type: 'string', path: 'end_loc.id' },
                location_type: {
                  object_type: 'string',
                  path: 'end_loc.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'end_loc.action',
                  default: 'Drop',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'end_loc.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'end_loc.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'end_loc.dimensions.height',
                    default: 10,
                  },
                },
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
      expect(result.sample_data).toBeDefined();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
          updates: {
            object_type: 'array',
            source: 'input.task_updates',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'id' },
              task_type: {
                object_type: 'string',
                path: 'kind',
                default: 'CrossDocking',
              },
            },
          },
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
          reason: {
            object_type: 'string',
            path: 'input.reason',
            default: 'User requested cancellation',
          },
          timestamp: {
            object_type: 'string',
            path: 'input.timestamp',
            default: new Date().toISOString(),
          },
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
      expect(result.sample_data).toBeDefined();
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'non-existent-warehouse';
      const configData = {
        config: {
          object_type: 'object',
          reason: { object_type: 'string', path: 'input.reason' },
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
      expect(result.sample_data).toBeDefined();
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

  describe('getConfigMapping', () => {
    it('should return warehouse configuration mapping', async () => {
      const warehouseId = 'WH_001';
      const mockWarehouse = {
        warehouse_id: warehouseId,
        warehouse_name: 'Test Warehouse',
        create_task_config: { test: 'config' },
        update_task_config: { test: 'config' },
        cancel_task_config: { test: 'config' },
        get_location_config: { test: 'config' },
      };

      jest
        .spyOn(mockWarehouseRepository, 'findOne')
        .mockResolvedValue(mockWarehouse as any);

      const result = await service.getConfigMapping(warehouseId);

      expect(result).toEqual({
        warehouse_id: warehouseId,
        warehouse_name: 'Test Warehouse',
        create_task_config: { test: 'config' },
        update_task_config: { test: 'config' },
        cancel_task_config: { test: 'config' },
        get_location_config: { test: 'config' },
      });
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      const warehouseId = 'WH_001';

      jest.spyOn(mockWarehouseRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getConfigMapping(warehouseId)).rejects.toThrow(
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
            source: 'input.operations',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'op.task_id' },
              task_type: {
                object_type: 'string',
                path: 'op.task_type',
                default: 'CrossDocking',
              },
              start_location: {
                object_type: 'object',
                location_id: { object_type: 'string', path: 'op.start.id' },
                location_type: {
                  object_type: 'string',
                  path: 'op.start.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.start.action',
                  default: 'Pick',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.start.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.start.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.start.dimensions.height',
                    default: 10,
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: { object_type: 'string', path: 'op.end.id' },
                location_type: {
                  object_type: 'string',
                  path: 'op.end.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.end.action',
                  default: 'Drop',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.end.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.end.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.end.dimensions.height',
                    default: 10,
                  },
                },
              },
              cargos: {
                object_type: 'array',
                source: 'op.items',
                map: {
                  object_type: 'object',
                  cargo_code: { object_type: 'string', path: 'code' },
                },
              },
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
      expect(result.sample_data).toBeDefined();
    });

    it('should handle null and default values correctly', async () => {
      const warehouseId = 'test-warehouse-1';
      const configWithNulls = {
        config: {
          object_type: 'object',
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
                location_type: {
                  object_type: 'string',
                  path: 'start.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'start.action',
                  default: 'Pick',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'start.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'start.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'start.dimensions.height',
                    default: 10,
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: { object_type: 'string', path: 'end.id' },
                location_type: {
                  object_type: 'string',
                  path: 'end.type',
                  default: 'Storage',
                },
                location_action: {
                  object_type: 'string',
                  path: 'end.action',
                  default: 'Drop',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'end.dimensions.length',
                    default: 10,
                  },
                  width: {
                    object_type: 'number',
                    path: 'end.dimensions.width',
                    default: 10,
                  },
                  height: {
                    object_type: 'number',
                    path: 'end.dimensions.height',
                    default: 10,
                  },
                },
              },
              cargos: {
                object_type: 'array',
                source: 'items',
                map: {
                  object_type: 'object',
                  cargo_code: { object_type: 'string', path: 'code' },
                },
              },
            },
          },
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
      expect(result.sample_data).toBeDefined();
    });
  });
});
