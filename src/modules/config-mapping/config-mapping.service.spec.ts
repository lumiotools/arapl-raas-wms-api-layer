import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
          batch_job_id: { object_type: 'string', path: 'input.custom_job_id' },
          batch_priority: {
            object_type: 'number',
            path: 'input.custom_priority',
            default: 10,
          },
          batch_type: {
            object_type: 'string',
            path: 'input.custom_type',
            default: 'Custom',
          },
          batch_frequency: {
            object_type: 'number',
            path: 'input.custom_frequency',
          },
          tasks: {
            object_type: 'array',
            source: 'input.custom_task',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'op.custom_task_id' },
              task_type: { object_type: 'string', path: 'op.custom_task_type' },
              task_dependency: {
                object_type: 'null',
                path: 'op.custom_task_dependency',
              },
              start_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.start_location.custom_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.start_location.custom_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.start_location.custom_location_type',
                  default: 'Custom',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.custom_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.custom_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.custom_height',
                  },
                },
                location_attribute: {
                  object_type: 'object',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.custom_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.custom_attribute_value',
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.end_location.custom_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.end_location.custom_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.end_location.custom_location_type',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.custom_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.custom_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.custom_height',
                  },
                },
                location_attribute: {
                  object_type: 'null',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.custom_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.custom_attribute_value',
                  },
                },
              },
              wait: {
                object_type: 'null',
                wait_type: {
                  object_type: 'string',
                  path: 'op.wait.custom_wait_type',
                },
                wait_condition: {
                  object_type: 'string',
                  path: 'op.wait.custom_wait_condition',
                },
                start_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.custom_start_location_wait_time',
                  default: 5,
                },
                end_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.custom_end_location_wait_time',
                  default: 5,
                },
                start_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.custom_start_location_available_wait',
                  default: true,
                },
                end_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.custom_end_location_available_wait',
                  default: true,
                },
                wait_status: {
                  object_type: 'string',
                  path: 'op.wait.custom_wait_status',
                  default: 'Custom',
                },
                timeout: {
                  object_type: 'number',
                  path: 'op.wait.custom_timeout',
                  default: 900,
                },
                fallback_action: {
                  object_type: 'string',
                  path: 'op.wait.custom_fallback_action',
                  default: 'Custom',
                },
              },
              cargos: {
                object_type: 'array',
                source: 'op.custom_cargos',
                map: {
                  object_type: 'object',
                  cargo_code: {
                    object_type: 'string',
                    path: 'item.custom_cargo_code',
                  },
                  cargo_type: {
                    object_type: 'string',
                    path: 'item.custom_cargo_type',
                  },
                  cargo_dimension: {
                    object_type: 'object',
                    length: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.custom_length',
                    },
                    width: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.custom_width',
                    },
                    height: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.custom_height',
                    },
                  },
                  cargo_weight: {
                    object_type: 'number',
                    path: 'item.custom_cargo_weight',
                  },
                  cargo_attributes: {
                    object_type: 'object',
                    attribute_name: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.custom_attribute_name',
                    },
                    attribute_value: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.custom_attribute_value',
                    },
                  },
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
          batch_job_id: { object_type: 'string', path: 'input.job_id' },
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
                  cargo_code: {
                    object_type: 'string',
                    path: 'item.cargo_code',
                  },
                  cargo_type: {
                    object_type: 'string',
                    path: 'item.cargo_type',
                  },
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
      };

      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCreateTaskConfig(warehouseId, configData),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when config structure is invalid', async () => {
      const warehouseId = 'test-warehouse-1';
      const invalidConfigData = {
        config: {
          object_type: 'object',
          // Missing required fields
          invalid_field: { object_type: 'string', path: 'input.invalid' },
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(
        mockWarehouse as Warehouse,
      );

      await expect(
        service.updateCreateTaskConfig(warehouseId, invalidConfigData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUpdateTaskConfig', () => {
    it('should update update task config successfully', async () => {
      const warehouseId = 'test-warehouse-1';
      const configData = {
        config: {
          object_type: 'object',
          batch_job_id: {
            object_type: 'string',
            path: 'input.custom_job_id',
          },
          timestamp: {
            object_type: 'string',
            path: 'input.custom_update_timestamp',
          },
          updates: {
            object_type: 'array',
            source: 'input.custom_tasks_to_update',
            map: {
              object_type: 'object',
              task_id: {
                object_type: 'string',
                path: 'op.custom_id',
              },
              task_type: {
                object_type: 'string',
                path: 'op.custom_type',
              },
              task_dependency: {
                object_type: 'string',
                path: 'op.custom_depends_on',
              },
              start_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.source_location.custom_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.source_location.custom_action',
                },
                location_zone: {
                  object_type: 'null',
                  path: 'op.source_location.custom_zone',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.source_location.dimensions.custom_len',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.source_location.dimensions.custom_wid',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.source_location.dimensions.custom_ht',
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.destination_location.custom_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.destination_location.custom_action',
                },
                location_zone: {
                  object_type: 'null',
                  path: 'op.destination_location.custom_zone',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.destination_location.dimensions.custom_len',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.destination_location.dimensions.custom_wid',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.destination_location.dimensions.custom_ht',
                  },
                },
              },
              wait_time: {
                object_type: 'null',
                wait_type: {
                  object_type: 'string',
                  path: 'op.wait_config.custom_type',
                },
                start_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait_config.custom_source_wait',
                },
                end_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait_config.custom_destination_wait',
                },
              },
              cargos: {
                object_type: 'array',
                source: 'op.custom_cargos',
                map: {
                  object_type: 'object',
                  cargo_code: {
                    object_type: 'string',
                    path: 'item.custom_code',
                  },
                  cargo_type: {
                    object_type: 'string',
                    path: 'item.custom_type',
                  },
                  cargo_dimension: {
                    object_type: 'object',
                    length: {
                      object_type: 'number',
                      path: 'item.dimensions.custom_len',
                    },
                    width: {
                      object_type: 'number',
                      path: 'item.dimensions.custom_wid',
                    },
                    height: {
                      object_type: 'number',
                      path: 'item.dimensions.custom_ht',
                    },
                  },
                  cargo_weight: {
                    object_type: 'number',
                    path: 'item.custom_weight',
                  },
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
                  cargo_code: { object_type: 'string', path: 'item.code' },
                  cargo_type: { object_type: 'string', path: 'item.type' },
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
                  cargo_weight: { object_type: 'number', path: 'item.weight' },
                },
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
            path: 'input.custom_cancellation_reason',
          },
          timestamp: {
            object_type: 'string',
            path: 'input.custom_cancellation_timestamp',
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
          reason: { object_type: 'string', path: 'input.cancellation_reason' },
          timestamp: {
            object_type: 'string',
            path: 'input.cancellation_timestamp',
          },
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
                path: 'input.custom_location_status',
                default: 'Custom',
              },
              location_zone: {
                object_type: 'string',
                path: 'input.custom_location_zone',
              },
              location_type: {
                object_type: 'string',
                path: 'input.custom_location_type',
              },
              location_level: {
                object_type: 'string',
                path: 'input.custom_location_level',
                default: 'Custom',
              },
              location_limit: {
                object_type: 'number',
                path: 'input.custom_location_limit',
              },
            },
            query_params: {
              param1: 'input.custom_zone_id',
              param2: 'null',
            },
            path_params: {
              param3: 'input.custom_zones[1].id',
            },
          },
          response: {
            body: {
              object_type: 'object',
              zone_id: {
                object_type: 'string',
                path: 'input.custom_zones[1].id',
              },
              available_locations: {
                object_type: 'array',
                source: 'input.custom_available_locations',
                map: {
                  object_type: 'object',
                  location_id: {
                    object_type: 'string',
                    path: 'loc.custom_location_id',
                  },
                  location_dimension: {
                    object_type: 'object',
                    lenght: {
                      object_type: 'object',
                      length: {
                        object_type: 'number',
                        path: 'loc.dimension.custom_Len.length',
                      },
                    },
                    width: {
                      object_type: 'object',
                      width: {
                        object_type: 'number',
                        path: 'loc.dimension.custom_Width.width',
                      },
                    },
                    height: {
                      object_type: 'object',
                      height: {
                        object_type: 'number',
                        path: 'loc.dimension.custom_Height.height',
                      },
                    },
                  },
                  location_type: {
                    object_type: 'string',
                    path: 'loc.custom_location_type',
                  },
                  cargo_quantity: {
                    object_type: 'number',
                    path: 'loc.custom_cargo_quantity',
                  },
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
              location_zone: {
                object_type: 'string',
                path: 'input.location_zone',
              },
              location_type: {
                object_type: 'string',
                path: 'input.location_type',
              },
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
                  location_id: {
                    object_type: 'string',
                    path: 'loc.location_id',
                  },
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
          batch_job_id: { object_type: 'string', path: 'input.complex_job_id' },
          batch_priority: {
            object_type: 'number',
            path: 'input.complex_batch_priority',
            default: 15,
          },
          batch_type: {
            object_type: 'string',
            path: 'input.complex_batch_type',
            default: 'Complex',
          },
          batch_frequency: {
            object_type: 'number',
            path: 'input.complex_batch_frequency',
          },
          tasks: {
            object_type: 'array',
            source: 'input.complex_task',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'op.complex_task_id' },
              task_type: {
                object_type: 'string',
                path: 'op.complex_task_type',
              },
              task_dependency: {
                object_type: 'null',
                path: 'op.complex_task_dependency',
              },
              start_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.start_location.complex_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.start_location.complex_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.start_location.complex_location_type',
                  default: 'Complex',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.complex_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.complex_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.complex_height',
                  },
                },
                location_attribute: {
                  object_type: 'object',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.complex_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.complex_attribute_value',
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.end_location.complex_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.end_location.complex_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.end_location.complex_location_type',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.complex_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.complex_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.complex_height',
                  },
                },
                location_attribute: {
                  object_type: 'null',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.complex_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.complex_attribute_value',
                  },
                },
              },
              wait: {
                object_type: 'null',
                wait_type: {
                  object_type: 'string',
                  path: 'op.wait.complex_wait_type',
                },
                wait_condition: {
                  object_type: 'string',
                  path: 'op.wait.complex_wait_condition',
                },
                start_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.complex_start_location_wait_time',
                  default: 10,
                },
                end_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.complex_end_location_wait_time',
                  default: 10,
                },
                start_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.complex_start_location_available_wait',
                  default: true,
                },
                end_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.complex_end_location_available_wait',
                  default: true,
                },
                wait_status: {
                  object_type: 'string',
                  path: 'op.wait.complex_wait_status',
                  default: 'Complex',
                },
                timeout: {
                  object_type: 'number',
                  path: 'op.wait.complex_timeout',
                  default: 3600,
                },
                fallback_action: {
                  object_type: 'string',
                  path: 'op.wait.complex_fallback_action',
                  default: 'Complex',
                },
              },
              cargos: {
                object_type: 'array',
                source: 'op.complex_cargos',
                map: {
                  object_type: 'object',
                  cargo_code: {
                    object_type: 'string',
                    path: 'item.complex_cargo_code',
                  },
                  cargo_type: {
                    object_type: 'string',
                    path: 'item.complex_cargo_type',
                  },
                  cargo_dimension: {
                    object_type: 'object',
                    length: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.complex_length',
                    },
                    width: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.complex_width',
                    },
                    height: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.complex_height',
                    },
                  },
                  cargo_weight: {
                    object_type: 'number',
                    path: 'item.complex_cargo_weight',
                  },
                  cargo_attributes: {
                    object_type: 'object',
                    attribute_name: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.complex_attribute_name',
                    },
                    attribute_value: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.complex_attribute_value',
                    },
                  },
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
          batch_job_id: { object_type: 'string', path: 'input.null_job_id' },
          batch_priority: {
            object_type: 'number',
            path: 'input.null_batch_priority',
            default: 20,
          },
          batch_type: {
            object_type: 'string',
            path: 'input.null_batch_type',
            default: 'Null',
          },
          batch_frequency: {
            object_type: 'number',
            path: 'input.null_batch_frequency',
          },
          tasks: {
            object_type: 'array',
            source: 'input.null_task',
            map: {
              object_type: 'object',
              task_id: { object_type: 'string', path: 'op.null_task_id' },
              task_type: { object_type: 'string', path: 'op.null_task_type' },
              task_dependency: {
                object_type: 'null',
                path: 'op.null_task_dependency',
              },
              start_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.start_location.null_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.start_location.null_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.start_location.null_location_type',
                  default: 'Null',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.null_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.null_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.start_location.location_dimension.null_height',
                  },
                },
                location_attribute: {
                  object_type: 'object',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.null_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.start_location.location_attribute.null_attribute_value',
                  },
                },
              },
              end_location: {
                object_type: 'object',
                location_id: {
                  object_type: 'string',
                  path: 'op.end_location.null_location_id',
                },
                location_action: {
                  object_type: 'string',
                  path: 'op.end_location.null_location_action',
                },
                location_type: {
                  object_type: 'string',
                  path: 'op.end_location.null_location_type',
                },
                location_dimension: {
                  object_type: 'object',
                  length: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.null_length',
                  },
                  width: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.null_width',
                  },
                  height: {
                    object_type: 'number',
                    path: 'op.end_location.location_dimension.null_height',
                  },
                },
                location_attribute: {
                  object_type: 'null',
                  attribute_name: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.null_attribute_name',
                  },
                  attribute_value: {
                    object_type: 'string',
                    path: 'op.end_location.location_attribute.null_attribute_value',
                  },
                },
              },
              wait: {
                object_type: 'null',
                wait_type: {
                  object_type: 'string',
                  path: 'op.wait.null_wait_type',
                },
                wait_condition: {
                  object_type: 'string',
                  path: 'op.wait.null_wait_condition',
                },
                start_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.null_start_location_wait_time',
                  default: 15,
                },
                end_location_wait_time: {
                  object_type: 'number',
                  path: 'op.wait.null_end_location_wait_time',
                  default: 15,
                },
                start_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.null_start_location_available_wait',
                  default: false,
                },
                end_location_available_wait: {
                  object_type: 'boolean',
                  path: 'op.wait.null_end_location_available_wait',
                  default: false,
                },
                wait_status: {
                  object_type: 'string',
                  path: 'op.wait.null_wait_status',
                  default: 'Null',
                },
                timeout: {
                  object_type: 'number',
                  path: 'op.wait.null_timeout',
                  default: 2700,
                },
                fallback_action: {
                  object_type: 'string',
                  path: 'op.wait.null_fallback_action',
                  default: 'Null',
                },
              },
              cargos: {
                object_type: 'array',
                source: 'op.null_cargos',
                map: {
                  object_type: 'object',
                  cargo_code: {
                    object_type: 'string',
                    path: 'item.null_cargo_code',
                  },
                  cargo_type: {
                    object_type: 'string',
                    path: 'item.null_cargo_type',
                  },
                  cargo_dimension: {
                    object_type: 'object',
                    length: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.null_length',
                    },
                    width: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.null_width',
                    },
                    height: {
                      object_type: 'number',
                      path: 'item.cargo_dimension.null_height',
                    },
                  },
                  cargo_weight: {
                    object_type: 'number',
                    path: 'item.null_cargo_weight',
                  },
                  cargo_attributes: {
                    object_type: 'object',
                    attribute_name: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.null_attribute_name',
                    },
                    attribute_value: {
                      object_type: 'string',
                      path: 'item.cargo_attributes.null_attribute_value',
                    },
                  },
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
        configWithNulls,
      );

      expect(result.success).toBe(true);
      expect(result.sample_data).toBeDefined();
    });
  });
});
