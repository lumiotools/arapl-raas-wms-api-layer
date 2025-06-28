import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Validator } from 'class-validator';
import { RobotJobService } from './robot-job.service';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { Location } from './entities/locations.entity';
import { Warehouse } from './entities/warehouse.entity';
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
import {
  GetLocationReq,
  GetLocationRes,
  LocationStatus,
} from './dto/GetLocation.dto';
import { UpdateWebhookReq, UpdateWebhookRes } from './dto/UpdateWebhook.dto';

describe('RobotJobService', () => {
  let service: RobotJobService;
  let batchJobRepository: Repository<BatchJob>;
  let taskRepository: Repository<Task>;
  let locationRepository: Repository<Location>;
  let warehouseRepository: Repository<Warehouse>;
  let validator: Validator;

  const mockBatchJobRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockTaskRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockLocationRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockWarehouseRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockValidator = {
    validate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotJobService,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: mockBatchJobRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: mockLocationRepository,
        },
        {
          provide: getRepositoryToken(Warehouse),
          useValue: mockWarehouseRepository,
        },
        {
          provide: Validator,
          useValue: mockValidator,
        },
      ],
    }).compile();

    service = module.get<RobotJobService>(RobotJobService);
    batchJobRepository = module.get<Repository<BatchJob>>(
      getRepositoryToken(BatchJob),
    );
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    locationRepository = module.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    warehouseRepository = module.get<Repository<Warehouse>>(
      getRepositoryToken(Warehouse),
    );
    validator = module.get<Validator>(Validator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasksByBatchId', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_123';

    const mockBatchJob = {
      id: 'batch-uuid-1',
      batch_job_id: batchId,
      warehouse_id: warehouseId,
      status: 'pending',
    };

    const mockTasks = [
      {
        id: 'task-uuid-1',
        task_id: 'TASK_001',
        task_type: TaskType.CrossDocking,
        batch_job_id: mockBatchJob.id,
        status: 'pending',
      },
      {
        id: 'task-uuid-2',
        task_id: 'TASK_002',
        task_type: TaskType.Picking,
        batch_job_id: mockBatchJob.id,
        status: 'pending',
      },
    ];

    it('should return tasks for a valid batch ID', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.find.mockResolvedValue(mockTasks);

      const result = await service.getTasksByBatchId(warehouseId, batchId);

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: batchId, warehouse_id: warehouseId },
      });
      expect(taskRepository.find).toHaveBeenCalledWith({
        where: { batch_job_id: mockBatchJob.id },
      });
      expect(result).toEqual(mockTasks);
    });

    it('should throw NotFoundException when batch job not found', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getTasksByBatchId(warehouseId, batchId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createTask', () => {
    const warehouseId = 'WH_001';
    const validCreateTaskDto: TaskGenerationReq = {
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

    const mockBatchJob = {
      id: 'batch-uuid-1',
      batch_job_id: 'BATCH_001',
      warehouse_id: warehouseId,
      status: 'pending',
    };

    const mockTask = {
      id: 'task-uuid-1',
      task_id: 'TASK_001',
      batch_job: mockBatchJob,
      status: 'pending',
    };

    it('should successfully create a batch and tasks', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(null);
      mockBatchJobRepository.create.mockReturnValue(mockBatchJob);
      mockBatchJobRepository.save.mockResolvedValue(mockBatchJob);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.createTask(warehouseId, validCreateTaskDto);

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: 'BATCH_001', warehouse_id: warehouseId },
      });
      expect(batchJobRepository.create).toHaveBeenCalled();
      expect(batchJobRepository.save).toHaveBeenCalled();
      expect(taskRepository.create).toHaveBeenCalled();
      expect(taskRepository.save).toHaveBeenCalled();
      expect(result).toEqual({
        batch_id: 'BATCH_001',
        status: 'success',
      });
    });

    it('should generate batch_job_id if not provided', async () => {
      const dtoWithoutBatchId = { ...validCreateTaskDto };
      delete dtoWithoutBatchId.batch_job_id;

      mockBatchJobRepository.findOne.mockResolvedValue(null);
      mockBatchJobRepository.create.mockReturnValue(mockBatchJob);
      mockBatchJobRepository.save.mockResolvedValue(mockBatchJob);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.createTask(warehouseId, dtoWithoutBatchId);

      expect(result.status).toBe('success');
      expect(result.batch_id).toMatch(/^Batch-\d+$/);
    });

    it('should throw BadRequestException when no tasks provided', async () => {
      const dtoWithoutTasks = { ...validCreateTaskDto, tasks: [] };

      await expect(
        service.createTask(warehouseId, dtoWithoutTasks),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when batch already exists', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);

      await expect(
        service.createTask(warehouseId, validCreateTaskDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for continuous batch without frequency', async () => {
      const continuousBatchDto = {
        ...validCreateTaskDto,
        batch_type: batch_type.Continuous,
      };

      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createTask(warehouseId, continuousBatchDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle wait condition validation and continue with batch creation', async () => {
      const taskWithWait = {
        ...validCreateTaskDto,
        tasks: [
          {
            ...validCreateTaskDto.tasks[0],
            wait: {
              wait_type: WaitType.Conditional,
              wait_condition: WaitCondition.Time,
              start_location_wait_time: 0,
              end_location_wait_time: 0,
            },
          },
        ],
      };

      mockBatchJobRepository.findOne.mockResolvedValue(null);
      mockBatchJobRepository.create.mockReturnValue(mockBatchJob);
      mockBatchJobRepository.save.mockResolvedValue(mockBatchJob);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      // The service logs errors and continues batch creation
      const result = await service.createTask(warehouseId, taskWithWait);

      expect(result.status).toBe('success');
      expect(result.batch_id).toBe('BATCH_001');
    });
  });

  describe('updateLocation', () => {
    const mockLocation = {
      location_id: 'LOC_001',
    } as any;

    it('should update location successfully', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);
      mockLocationRepository.update.mockResolvedValue(undefined);

      await service.updateLocation(mockLocation, false);

      expect(locationRepository.findOne).toHaveBeenCalledWith({
        where: { location_id: 'LOC_001' },
      });
      expect(locationRepository.update).toHaveBeenCalledWith(
        { location_id: 'LOC_001' },
        { isEmpty: false },
      );
    });

    it('should throw error when location not found', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(service.updateLocation(mockLocation, false)).rejects.toThrow(
        'Location with id LOC_001 does not exist',
      );
    });

    it('should throw error when location_id is missing', async () => {
      const locationWithoutId = { ...mockLocation };
      delete locationWithoutId.location_id;

      await expect(
        service.updateLocation(locationWithoutId, false),
      ).rejects.toThrow("Location or location ID doesn't exists.");
    });
  });

  describe('checkLocation', () => {
    const mockLocation = {
      location_id: 'LOC_001',
      isEmpty: true,
    } as any;

    it('should pass validation when location state matches expected', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);

      await expect(
        service.checkLocation(mockLocation, true),
      ).resolves.not.toThrow();
    });

    it('should throw error when location state does not match expected', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockLocation);

      await expect(service.checkLocation(mockLocation, false)).rejects.toThrow(
        'Location with id LOC_001 is not in the expected state. Expected: false, Actual: true',
      );
    });

    it('should throw error when location not found', async () => {
      mockLocationRepository.findOne.mockResolvedValue(null);

      await expect(service.checkLocation(mockLocation, true)).rejects.toThrow(
        'Location with id LOC_001 does not exist',
      );
    });
  });

  describe('updateTask', () => {
    const warehouseId = 'WH_001';
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

    const mockBatchJob = {
      id: 'batch-uuid-1',
      batch_job_id: 'BATCH_001',
      warehouse_id: warehouseId,
      status: 'pending',
    };

    const mockTask = {
      id: 'task-uuid-1',
      task_id: 'TASK_001',
      batch_job_id: mockBatchJob.id,
      status: 'pending',
      start_location: {
        location_id: 'LOC_OLD_001',
        location_dimension: { length: 80, width: 40, height: 60 },
      },
      end_location: {
        location_id: 'LOC_OLD_002',
        location_dimension: { length: 80, width: 40, height: 60 },
      },
      cargos: [
        {
          cargo_code: 'CARGO_001',
          cargo_dimension: { length: 80, width: 40, height: 60 },
          cargo_weight: 10,
        },
      ],
    };

    it('should successfully update tasks', async () => {
      const mockWarehouse = { id: 'wh-1', warehouse_id: warehouseId };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.update.mockResolvedValue(undefined);

      const result = await service.updateTask(warehouseId, validUpdateDto);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(result.status).toBe('success');
      expect(result.batch_id).toBe('BATCH_001');
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask(warehouseId, validUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelBatch', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const cancelReq: CancelReq = {
      reason: 'User requested cancellation',
    };

    const mockBatchJob = {
      id: 'batch-uuid-1',
      batch_job_id: batchId,
      warehouse_id: warehouseId,
      status: 'pending',
    };

    it('should successfully cancel a batch', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockBatchJobRepository.remove.mockResolvedValue(undefined);

      const result = await service.cancelBatch(warehouseId, batchId, cancelReq);

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: batchId, warehouse_id: warehouseId },
      });
      expect(mockBatchJobRepository.remove).toHaveBeenCalledWith(mockBatchJob);
      expect(result.status).toBe('success');
      expect(result.batch_id).toBe(batchId);
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelBatch(warehouseId, batchId, cancelReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelTask', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const taskId = 'TASK_001';
    const cancelReq: CancelReq = {
      reason: 'Task no longer needed',
    };

    const mockBatchJob = {
      id: 'batch-uuid-1',
      batch_job_id: batchId,
      warehouse_id: warehouseId,
      status: 'pending',
    };

    const mockTask = {
      id: 'task-uuid-1',
      task_id: taskId,
      batch_job_id: mockBatchJob.id,
      status: 'pending',
    };

    it('should successfully cancel a task', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.remove.mockResolvedValue(undefined);

      const result = await service.cancelTask(
        warehouseId,
        batchId,
        taskId,
        cancelReq,
      );

      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: {
          task_id: taskId,
          batch_job: { batch_job_id: batchId },
        },
        relations: ['batch_job'],
      });
      expect(mockTaskRepository.remove).toHaveBeenCalledWith(mockTask);
      expect(result.status).toBe('success');
      expect(result.task_id).toBe(taskId);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelTask(warehouseId, batchId, taskId, cancelReq),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unstructureHelper', () => {
    it('should extract value from nested object path', () => {
      const input = {
        data: {
          items: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
        },
      };

      const [success, value, error] = service.unstructureHelper(
        input,
        'input.data.items[0].name',
      );

      expect(success).toBe(true);
      expect(value).toBe('Item 1');
      expect(error).toBeNull();
    });

    it('should return false for invalid path', () => {
      const input = { data: { value: 'test' } };

      const [success, value, error] = service.unstructureHelper(
        input,
        'input.data.nonexistent',
      );

      expect(success).toBe(false);
      expect(value).toBeNull();
      expect(error).toBe('nonexistent');
    });

    it('should handle null expression', () => {
      const input = { data: 'test' };

      const [success, value, error] = service.unstructureHelper(input, 'null');

      expect(success).toBe(true);
      expect(value).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe('updateWebhook', () => {
    const warehouseId = 'WH_001';
    const updateWebhookDto: UpdateWebhookReq = {
      webhook_url: 'https://example.com/webhook',
    };

    const mockWarehouse = {
      id: 'warehouse-uuid-1',
      warehouse_id: warehouseId,
      webhook_url: null,
    };

    it('should successfully update webhook', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseRepository.save.mockResolvedValue({
        ...mockWarehouse,
        webhook_url: updateWebhookDto.webhook_url,
      });

      const result = await service.updateWebhook(warehouseId, updateWebhookDto);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(result.status).toBe('success');
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateWebhook(warehouseId, updateWebhookDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty arrays gracefully', async () => {
      const emptyTaskDto = {
        batch_job_id: 'BATCH_001',
        batch_priority: 5,
        batch_type: batch_type.Discrete,
        tasks: [],
      };

      await expect(service.createTask('WH_001', emptyTaskDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle malformed location data', async () => {
      const invalidLocation = null as any;

      await expect(
        service.updateLocation(invalidLocation, true),
      ).rejects.toThrow("Location or location ID doesn't exists.");
    });

    it('should handle concurrent batch creation attempts', async () => {
      const taskDto: TaskGenerationReq = {
        batch_job_id: 'BATCH_CONCURRENT',
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
            cargos: [{ cargo_code: 'CARGO_001' }],
          },
        ],
      };

      // First call succeeds, second call should fail due to conflict
      mockBatchJobRepository.findOne
        .mockResolvedValueOnce(null) // First check - no existing batch
        .mockResolvedValueOnce({
          id: 'existing',
          batch_job_id: 'BATCH_CONCURRENT',
        }); // Second check - batch exists

      const mockBatch = { id: 'batch-1', batch_job_id: 'BATCH_CONCURRENT' };
      mockBatchJobRepository.create.mockReturnValue(mockBatch);
      mockBatchJobRepository.save.mockResolvedValue(mockBatch);
      mockTaskRepository.create.mockReturnValue({ id: 'task-1' });
      mockTaskRepository.save.mockResolvedValue({ id: 'task-1' });

      // First call should succeed
      const result1 = await service.createTask('WH_001', taskDto);
      expect(result1.status).toBe('success');

      // Second call should fail
      await expect(service.createTask('WH_001', taskDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
