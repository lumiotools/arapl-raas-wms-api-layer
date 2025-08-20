import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { RobotJobController } from './robot-job.controller';
import { RobotJobService } from './robot-job.service';
import {
  TaskGenerationReq,
  TaskGenerationRes,
  TaskType,
  LocationType as TaskLocationType,
  LocationAction,
  batch_type,
  WaitType,
  FallbackAction,
  WaitCondition,
  WaitStatus,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { CancelReq, BatchCancelRes, TaskCancelRes } from './dto/Cancel.dto';
import {
  GetLocationRes,
  LocationStatus,
  LocationType,
} from './dto/GetLocation.dto';
import { GetTasksParamsDto } from './dto/GetTasks.dto';
import { UpdateWebhookReq, UpdateWebhookRes } from './dto/UpdateWebhook.dto';
import {
  UpdateLocationTrackingReq,
  UpdateLocationTrackingRes,
} from './dto/UpdateLocationTracking.dto';

describe('RobotJobController', () => {
  let controller: RobotJobController;
  let service: RobotJobService;

  const mockRobotJobService = {
    getTasksByBatchId: jest.fn(),
    createTask: jest.fn(),
    createUnstructuredTask: jest.fn(),
    updateTask: jest.fn(),
    updateUnstructuredTask: jest.fn(),
    cancelBatch: jest.fn(),
    cancelUnstructuredBatch: jest.fn(),
    cancelTask: jest.fn(),
    cancelUnstructuredTask: jest.fn(),
    getLocations: jest.fn(),
    updateWebhook: jest.fn(),
    updateLocationTracking: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RobotJobController],
      providers: [
        {
          provide: RobotJobService,
          useValue: mockRobotJobService,
        },
      ],
    }).compile();

    controller = module.get<RobotJobController>(RobotJobController);
    service = module.get<RobotJobService>(RobotJobService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    const mockParams: GetTasksParamsDto = {
      warehouse_id: 'WH_001',
      batch_id: 'BATCH_123',
    };

    const mockTaskEntities = [
      {
        id: '1',
        task_id: 'TASK_001',
        task_type: TaskType.CrossDocking,
        wait_time: { wait_type: WaitType.Trigger },
        status: 'pending',
      },
      {
        id: '2',
        task_id: 'TASK_002',
        task_type: TaskType.Picking,
        wait_time: { wait_type: WaitType.Conditional },
        status: 'pending',
      },
    ];

    it('should return tasks for a valid warehouse and batch ID', async () => {
      mockRobotJobService.getTasksByBatchId.mockResolvedValue(mockTaskEntities);

      const result = await controller.getTasks(mockParams);

      expect(service.getTasksByBatchId).toHaveBeenCalledWith(
        'WH_001',
        'BATCH_123',
      );
      expect(result).toEqual({
        tasks: mockTaskEntities.map((entity) => ({
          ...entity,
          wait: entity.wait_time,
        })),
      });
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockRobotJobService.getTasksByBatchId.mockRejectedValue(
        new NotFoundException('Batch job not found'),
      );

      await expect(controller.getTasks(mockParams)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTask', () => {
    const warehouseId = 'WH_001';
    const mockRequest = {
      taskConfigs: { create_task: 'test_config' },
    } as any as Request;

    const validTaskDto: TaskGenerationReq = {
      batch_job_id: 'job12345',
      batch_priority: 5,
      batch_type: batch_type.DISCRETE,
      batch_frequency: 1,
      tasks: [
        {
          task_id: 'task001',
          task_type: TaskType.CrossDocking,
          task_dependency: 'abc',
          start_location: {
            location_id: 'ST1-4-1-1',
            location_type: TaskLocationType.Zone,
            location_action: LocationAction.Pick,
            location_dimension: {
              length: 10,
              width: 5,
              height: 5,
            },
            location_attribute: {
              attribute_name: 'temperature',
              attribute_value: 'cold',
            },
          },
          end_location: {
            location_id: 'DZ1-6-1-6',
            location_type: TaskLocationType.Zone,
            location_action: LocationAction.Drop,
            location_dimension: {
              length: 8,
              width: 4,
              height: 4,
            },
            location_attribute: {
              attribute_name: 'weight_capacity',
              attribute_value: 'high',
            },
          },
          wait: {
            wait_type: WaitType.Trigger,
            wait_condition: WaitCondition.Time,
            start_location_wait_time: 10,
            end_location_wait_time: 5,
            wait_status: WaitStatus.NotStarted,
            fallback_action: FallbackAction.Error,
            timeout: 1800,
            start_location_available_wait: false,
            end_location_available_wait: false,
          },
          cargos: [
            {
              cargo_code: 'cargo001',
              cargo_type: 'Fragile',
              cargo_weight: 15,
              cargo_dimension: {
                length: 3,
                width: 3,
                height: 3,
              },
              cargo_attributes: {
                attribute_name: 'fragility',
                attribute_value: 'high',
              },
            },
          ],
        },
      ],
    };

    const successResponse: TaskGenerationRes = {
      batch_id: 'BATCH_001',
      status: 'success',
    };

    it('should create task with valid structured data', async () => {
      mockRobotJobService.createTask.mockResolvedValue(successResponse);

      const result = await controller.createTask(
        warehouseId,
        validTaskDto,
        mockRequest,
      );

      expect(service.createTask).toHaveBeenCalledWith(
        warehouseId,
        validTaskDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should create unstructured task when config exists and validation fails', async () => {
      const invalidStructuredData = { invalid: 'data' };
      mockRobotJobService.createUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      const result = await controller.createTask(
        warehouseId,
        invalidStructuredData,
        mockRequest,
      );

      expect(service.createUnstructuredTask).toHaveBeenCalledWith(
        warehouseId,
        'test_config',
        invalidStructuredData,
      );
      expect(result).toEqual(successResponse);
    });

    it('should throw BadRequestException when no config and invalid structure', async () => {
      const invalidData = { invalid: 'data' };
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      await expect(
        controller.createTask(warehouseId, invalidData, requestWithoutConfig),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return error status without throwing when service returns error', async () => {
      const errorResponse = {
        batch_id: 'BATCH_001',
        status: 'error: Invalid data',
      };
      mockRobotJobService.createTask.mockResolvedValue(errorResponse);

      const result = await controller.createTask(
        warehouseId,
        validTaskDto,
        mockRequest,
      );

      expect(result).toEqual(errorResponse);
      expect(result.status).toBe('error: Invalid data');
    });

    it('should handle service exceptions', async () => {
      mockRobotJobService.createTask.mockRejectedValue(
        new BadRequestException('Service error'),
      );

      await expect(
        controller.createTask(warehouseId, validTaskDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateTask', () => {
    const warehouseId = 'WH_001';
    const mockRequest = {
      taskConfigs: { update_task: 'update_config' },
    } as any as Request;

    const validUpdateDto: TaskUpdateReq = {
      batch_job_id: 'BATCH_001',
      updates: [
        {
          task_id: 'TASK_001',
          start_location: {
            location_id: 'LOC_001',
            location_dimension: { length: 100, width: 50, height: 80 },
          },
          end_location: {
            location_id: 'LOC_002',
            location_dimension: { length: 100, width: 50, height: 80 },
          },
          cargos: [
            {
              cargo_code: 'CARGO_001',
              cargo_dimension: { length: 100, width: 50, height: 80 },
            },
          ],
        },
      ],
    };

    const successResponse: TaskUpdateRes = {
      batch_id: 'BATCH_001',
      status: 'success',
      updated_at: '2024-01-01T00:00:00Z',
      message: 'Tasks updated successfully',
    };

    it('should update task with valid structured data', async () => {
      mockRobotJobService.updateTask.mockResolvedValue(successResponse);

      const result = await controller.updateTask(
        warehouseId,
        validUpdateDto,
        mockRequest,
      );

      expect(service.updateTask).toHaveBeenCalledWith(
        warehouseId,
        validUpdateDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should update unstructured task when config exists', async () => {
      const invalidData = { invalid: 'data' };
      mockRobotJobService.updateUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      const result = await controller.updateTask(
        warehouseId,
        invalidData,
        mockRequest,
      );

      expect(service.updateUnstructuredTask).toHaveBeenCalledWith(
        warehouseId,
        'update_config',
        invalidData,
      );
      expect(result).toEqual(successResponse);
    });

    it('should throw BadRequestException when service returns error status', async () => {
      const errorResponse = {
        batch_id: 'BATCH_001',
        status: 'error',
        message: 'Update failed',
        updated_at: '2024-01-01T00:00:00Z',
      };
      mockRobotJobService.updateTask.mockResolvedValue(errorResponse);

      await expect(
        controller.updateTask(warehouseId, validUpdateDto, mockRequest),
      ).rejects.toThrow(BadRequestException);
      expect(service.updateTask).toHaveBeenCalledWith(
        warehouseId,
        validUpdateDto,
      );
    });

    it('should throw BadRequestException when no config and invalid structure', async () => {
      const invalidData = { invalid: 'data' };
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      await expect(
        controller.updateTask(warehouseId, invalidData, requestWithoutConfig),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBatch', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const mockRequest = {
      taskConfigs: { cancel_task: 'cancel_config' },
    } as any as Request;

    const cancelDto: CancelReq = {
      reason: 'User requested cancellation',
    };

    const successResponse: BatchCancelRes = {
      batch_id: batchId,
      status: 'success',
      message: 'Batch cancelled successfully',
      cancelled_at: '2024-01-01T00:00:00Z',
    };

    it('should cancel batch with valid structured data', async () => {
      const requestWithoutConfig = { taskConfigs: null } as any as Request;
      mockRobotJobService.cancelBatch.mockResolvedValue(successResponse);

      const result = await controller.cancelBatch(
        warehouseId,
        batchId,
        cancelDto,
        requestWithoutConfig,
      );

      expect(service.cancelBatch).toHaveBeenCalledWith(
        warehouseId,
        batchId,
        cancelDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should cancel unstructured batch when config exists', async () => {
      const invalidData = { invalid: 'data' } as any;
      mockRobotJobService.cancelUnstructuredBatch.mockResolvedValue(
        successResponse,
      );

      const result = await controller.cancelBatch(
        warehouseId,
        batchId,
        invalidData,
        mockRequest,
      );

      expect(service.cancelUnstructuredBatch).toHaveBeenCalledWith(
        warehouseId,
        batchId,
        'cancel_config',
        invalidData,
      );
      expect(result).toEqual(successResponse);
    });

    it('should throw BadRequestException when service returns error status', async () => {
      const errorResponse = {
        batch_id: batchId,
        status: 'error',
        message: 'Cannot cancel batch',
        cancelled_at: '2024-01-01T00:00:00Z',
      };
      mockRobotJobService.cancelBatch.mockResolvedValue(errorResponse);
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      await expect(
        controller.cancelBatch(
          warehouseId,
          batchId,
          cancelDto,
          requestWithoutConfig,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when validation fails and no config', async () => {
      const invalidData = { invalid: 'data' } as any;
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      await expect(
        controller.cancelBatch(
          warehouseId,
          batchId,
          invalidData,
          requestWithoutConfig,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelTask', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const taskId = 'TASK_001';
    const mockRequest = {
      taskConfigs: { cancel_task: 'cancel_task_config' },
    } as any as Request;

    const cancelDto: CancelReq = {
      reason: 'Task no longer needed',
    };

    const successResponse: TaskCancelRes = {
      task_id: taskId,
      status: 'success',
      message: 'Task cancelled successfully',
      cancelled_at: '2024-01-01T00:00:00Z',
    };

    it('should cancel task with valid structured data', async () => {
      const requestWithoutConfig = { taskConfigs: null } as any as Request;
      mockRobotJobService.cancelTask.mockResolvedValue(successResponse);

      const result = await controller.cancelTask(
        warehouseId,
        batchId,
        taskId,
        cancelDto,
        requestWithoutConfig,
      );

      expect(service.cancelTask).toHaveBeenCalledWith(
        warehouseId,
        batchId,
        taskId,
        cancelDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should cancel unstructured task when config exists', async () => {
      const invalidData = { invalid: 'data' } as any;
      mockRobotJobService.cancelUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      const result = await controller.cancelTask(
        warehouseId,
        batchId,
        taskId,
        invalidData,
        mockRequest,
      );

      expect(service.cancelUnstructuredTask).toHaveBeenCalledWith(
        warehouseId,
        batchId,
        taskId,
        'cancel_task_config',
        invalidData,
      );
      expect(result).toEqual(successResponse);
    });

    it('should throw BadRequestException when service returns error status', async () => {
      const errorResponse = {
        task_id: taskId,
        status: 'error',
        message: 'Cannot cancel task',
        cancelled_at: '2024-01-01T00:00:00Z',
      };
      mockRobotJobService.cancelTask.mockResolvedValue(errorResponse);
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      await expect(
        controller.cancelTask(
          warehouseId,
          batchId,
          taskId,
          cancelDto,
          requestWithoutConfig,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEmptyLocations', () => {
    const warehouseId = 'WH_001';
    const mockRequest = {
      taskConfigs: { get_location: 'location_config' },
    } as any as Request;

    const successResponse: GetLocationRes = {
      zone_id: 'zone-1',
      available_location_types: [
        {
          location_id: 'LOC-DROP-101',
          location_dimension: {
            length: 100,
            width: 80,
            height: 150,
          },
          location_type: LocationType.Pallet,
          location_action: LocationAction.Drop,
        },
      ],
    };

    it('should get empty locations with query parameters when config exists', async () => {
      mockRobotJobService.getLocations.mockResolvedValue(successResponse);

      const result = await controller.getEmptyLocations(
        warehouseId,
        mockRequest,
        LocationStatus.Empty,
        'ZONE_A',
        LocationType.Pallet,
        '1',
        10,
      );

      expect(service.getLocations).toHaveBeenCalledWith(
        warehouseId,
        {
          location_status: LocationStatus.Empty,
          location_zone: 'ZONE_A',
          location_type: LocationType.Pallet,
          location_level: '1',
          location_limit: 10,
        },
        'location_config',
      );
      expect(result).toEqual(successResponse);
    });

    it('should return dummy response when no config exists', async () => {
      const requestWithoutConfig = { taskConfigs: null } as any as Request;

      const result = await controller.getEmptyLocations(
        warehouseId,
        requestWithoutConfig,
      );

      // Should not call service when no config
      expect(service.getLocations).not.toHaveBeenCalled();

      // Should return dummy response
      expect(result).toHaveProperty('zone_id');
      expect(result).toHaveProperty('available_location_types');
      expect(result.zone_id).toBe('zone-1');
      expect(Array.isArray(result.available_location_types)).toBe(true);
    });

    it('should handle service exceptions when config exists', async () => {
      mockRobotJobService.getLocations.mockRejectedValue(
        new NotFoundException('Warehouse not found'),
      );

      await expect(
        controller.getEmptyLocations(
          warehouseId,
          mockRequest,
          LocationStatus.Empty,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateWebhook', () => {
    const warehouseId = 'WH_001';
    const updateWebhookDto: UpdateWebhookReq = {
      webhook_url: 'https://example.com/webhook',
    };

    const successResponse: UpdateWebhookRes = {
      status: 'success',
      message: 'Webhook updated successfully',
      warehouse: {
        warehouse_id: 'WH_001',
        warehouse_name: 'Main Warehouse',
        webhook_url: 'https://example.com/webhook',
      },
    };

    it('should update webhook successfully', async () => {
      mockRobotJobService.updateWebhook.mockResolvedValue(successResponse);

      const result = await controller.updateWebhook(
        warehouseId,
        updateWebhookDto,
      );

      expect(service.updateWebhook).toHaveBeenCalledWith(
        warehouseId,
        updateWebhookDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should handle webhook update failure', async () => {
      mockRobotJobService.updateWebhook.mockRejectedValue(
        new BadRequestException('Invalid webhook URL'),
      );

      await expect(
        controller.updateWebhook(warehouseId, updateWebhookDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid webhook URL format', async () => {
      const invalidWebhookDto = {
        webhook_url: 'not-a-valid-url',
      };

      // Since validation happens in controller, this should throw before reaching service
      await expect(
        controller.updateWebhook(warehouseId, invalidWebhookDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    it('should handle service exceptions properly in getTasks', async () => {
      const mockParams: GetTasksParamsDto = {
        warehouse_id: 'WH_001',
        batch_id: 'NONEXISTENT',
      };

      mockRobotJobService.getTasksByBatchId.mockRejectedValue(
        new NotFoundException('Batch not found'),
      );

      await expect(controller.getTasks(mockParams)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle unexpected service errors', async () => {
      const mockParams: GetTasksParamsDto = {
        warehouse_id: 'WH_001',
        batch_id: 'BATCH_123',
      };

      mockRobotJobService.getTasksByBatchId.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getTasks(mockParams)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('updateLocationTracking', () => {
    const warehouseId = 'WH_001';
    const updateLocationTrackingDto: UpdateLocationTrackingReq = {
      locations_customer_managed: true,
    };

    const successResponse: UpdateLocationTrackingRes = {
      status: 'success',
      message: 'Location tracking settings updated successfully',
      warehouse: {
        warehouse_id: 'WH_001',
        warehouse_name: 'Main Warehouse',
        locations_customer_managed: true,
      },
    };

    it('should update location tracking successfully', async () => {
      mockRobotJobService.updateLocationTracking.mockResolvedValue(
        successResponse,
      );

      const result = await controller.updateLocationTracking(
        warehouseId,
        updateLocationTrackingDto,
      );

      expect(service.updateLocationTracking).toHaveBeenCalledWith(
        warehouseId,
        updateLocationTrackingDto,
      );
      expect(result).toEqual(successResponse);
    });

    it('should handle location tracking update failure', async () => {
      mockRobotJobService.updateLocationTracking.mockRejectedValue(
        new BadRequestException('Invalid location tracking settings'),
      );

      await expect(
        controller.updateLocationTracking(
          warehouseId,
          updateLocationTrackingDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid request body', async () => {
      const invalidDto = {
        locations_customer_managed: 'not-a-boolean',
      } as any;

      // Since validation happens in controller, this should throw before reaching service
      await expect(
        controller.updateLocationTracking(warehouseId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
