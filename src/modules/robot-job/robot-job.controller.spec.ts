import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Request } from 'express';
import { RobotJobController } from './robot-job.controller';
import { RobotJobService } from './robot-job.service';
import {
  TaskGenerationReq,
  TaskGenerationRes,
  TaskType,
  LocationType,
  LocationAction,
  batch_type,
  WaitType,
  WaitCondition,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { CancelReq, BatchCancelRes, TaskCancelRes } from './dto/Cancel.dto';
import { GetLocationRes, LocationStatus } from './dto/GetLocation.dto';
import { GetTasksParamsDto, GetTasksResponseDto } from './dto/GetTasks.dto';
import { UpdateWebhookReq, UpdateWebhookRes } from './dto/UpdateWebhook.dto';

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

  describe('unifiedCreateTask', () => {
    const warehouseId = 'WH_001';
    const mockRequest = {
      taskConfigs: { create_task: 'test_config' },
    } as any as Request;

    const validTaskDto: TaskGenerationReq = {
      batch_job_id: 'BATCH_001',
      batch_priority: 5,
      batch_type: batch_type.Discrete,
      tasks: [
        {
          task_id: 'TASK_001',
          task_type: TaskType.CrossDocking,
          start_location: {
            location_id: 'LOC_001',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Pick,
            location_dimension: { length: 100, width: 50, height: 80 },
          },
          end_location: {
            location_id: 'LOC_002',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Drop,
            location_dimension: { length: 100, width: 50, height: 80 },
          },
          cargos: [
            {
              cargo_code: 'CARGO_001',
              cargo_type: 'Box',
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

      const result = await controller.unifiedCreateTask(
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

      const result = await controller.unifiedCreateTask(
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
        controller.unifiedCreateTask(
          warehouseId,
          invalidData,
          requestWithoutConfig,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should not throw when service returns error status', async () => {
      mockRobotJobService.createTask.mockResolvedValue({
        batch_id: 'BATCH_001',
        status: 'error: Invalid data',
      });

      const result = await controller.unifiedCreateTask(
        warehouseId,
        validTaskDto,
        mockRequest,
      );

      // Controller doesn't check createTask response status
      expect(result.status).toBe('error: Invalid data');
    });
  });

  describe('unifiedUpdateTask', () => {
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

      const result = await controller.unifiedUpdateTask(
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

      const result = await controller.unifiedUpdateTask(
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

    it('should throw BadRequestException when service returns error', async () => {
      mockRobotJobService.updateTask.mockResolvedValue({
        batch_id: 'BATCH_001',
        status: 'error',
        message: 'Update failed',
        updated_at: '2024-01-01T00:00:00Z',
      });

      await expect(
        controller.unifiedUpdateTask(warehouseId, validUpdateDto, mockRequest),
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
  });

  describe('getEmptyLocations', () => {
    const warehouseId = 'WH_001';
    const mockRequest = {
      taskConfigs: { get_location: 'location_config' },
    } as any as Request;

    const successResponse: GetLocationRes = {} as any;

    it('should get empty locations with query parameters', async () => {
      mockRobotJobService.getLocations.mockResolvedValue(successResponse);

      const result = await controller.getEmptyLocations(
        warehouseId,
        mockRequest,
        LocationStatus.Empty,
        'ZONE_A',
        LocationType.Pallet as any,
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
    });
  });

  describe('updateWebhook', () => {
    const warehouseId = 'WH_001';
    const updateWebhookDto: UpdateWebhookReq = {
      webhook_url: 'https://example.com/webhook',
    } as any;

    const successResponse: UpdateWebhookRes = {
      status: 'success',
      message: 'Webhook updated successfully',
    } as any;

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
  });

  describe('Error Handling', () => {
    it('should handle service exceptions properly', async () => {
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
  });
});
