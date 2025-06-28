import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  HttpException,
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
  LocationType as GetLocationLocationType,
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

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: batchId, warehouse_id: warehouseId },
      });
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

      expect(batchJobRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when batch already exists', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);

      await expect(
        service.createTask(warehouseId, validCreateTaskDto),
      ).rejects.toThrow(ConflictException);

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: 'BATCH_001', warehouse_id: warehouseId },
      });
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

    it('should log errors for invalid wait conditions but continue with batch creation', async () => {
      const taskWithInvalidWait = {
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

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBatchJobRepository.findOne.mockResolvedValue(null);
      mockBatchJobRepository.create.mockReturnValue(mockBatchJob);
      mockBatchJobRepository.save.mockResolvedValue(mockBatchJob);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.createTask(warehouseId, taskWithInvalidWait);

      expect(result.status).toBe('success');
      expect(result.batch_id).toBe('BATCH_001');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle task creation errors and continue processing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBatchJobRepository.findOne.mockResolvedValue(null);
      mockBatchJobRepository.create.mockReturnValue(mockBatchJob);
      mockBatchJobRepository.save.mockResolvedValue(mockBatchJob);
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockRejectedValue(new Error('Database error'));

      const result = await service.createTask(warehouseId, validCreateTaskDto);

      expect(result.status).toBe('success');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('updateLocation', () => {
    const mockLocation = {
      location_id: 'LOC_001',
    } as any;

    const mockDbLocation = {
      location_id: 'LOC_001',
      isEmpty: true,
    };

    it('should update location successfully', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockDbLocation);
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

      expect(locationRepository.findOne).toHaveBeenCalledWith({
        where: { location_id: 'LOC_001' },
      });
      expect(locationRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error when location_id is missing', async () => {
      const locationWithoutId = { ...mockLocation };
      delete locationWithoutId.location_id;

      await expect(
        service.updateLocation(locationWithoutId, false),
      ).rejects.toThrow("Location or location ID doesn't exists.");

      expect(locationRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw error when location is null', async () => {
      await expect(service.updateLocation(null as any, false)).rejects.toThrow(
        "Location or location ID doesn't exists.",
      );
    });
  });

  describe('checkLocation', () => {
    const mockLocation = {
      location_id: 'LOC_001',
    } as any;

    const mockDbLocation = {
      location_id: 'LOC_001',
      isEmpty: true,
    };

    it('should pass validation when location state matches expected', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockDbLocation);

      await expect(
        service.checkLocation(mockLocation, true),
      ).resolves.not.toThrow();

      expect(locationRepository.findOne).toHaveBeenCalledWith({
        where: { location_id: 'LOC_001' },
      });
    });

    it('should throw error when location state does not match expected', async () => {
      mockLocationRepository.findOne.mockResolvedValue(mockDbLocation);

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

    it('should throw error when location is null', async () => {
      await expect(service.checkLocation(null as any, true)).rejects.toThrow(
        "Location or location ID doesn't exists.",
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

    const mockWarehouse = {
      id: 'wh-1',
      warehouse_id: warehouseId,
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
      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);

      const result = await service.updateTask(warehouseId, validUpdateDto);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: {
          batch_job_id: 'BATCH_001',
          warehouse_id: warehouseId,
        },
      });
      expect(result.status).toBe('success');
      expect(result.batch_id).toBe('BATCH_001');
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask(warehouseId, validUpdateDto),
      ).rejects.toThrow(NotFoundException);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTask(warehouseId, validUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle tasks not found and continue processing', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(null);

      const result = await service.updateTask(warehouseId, validUpdateDto);

      expect(result.status).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Task with ID TASK_001 not found'),
      );

      consoleSpy.mockRestore();
    });

    it('should continue processing despite task save errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockBatchJobRepository.findOne.mockResolvedValue(mockBatchJob);
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockRejectedValue(new Error('Save failed'));

      const result = await service.updateTask(warehouseId, validUpdateDto);

      expect(result.status).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error updating task TASK_001:'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should return no_updates status when no tasks provided', async () => {
      const emptyUpdateDto = {
        ...validUpdateDto,
        updates: [],
      };

      const result = await service.updateTask(warehouseId, emptyUpdateDto);

      expect(result.status).toBe('no_updates');
      expect(result.message).toBe('No tasks to update.');
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
      expect(batchJobRepository.remove).toHaveBeenCalledWith(mockBatchJob);
      expect(result.status).toBe('success');
      expect(result.batch_id).toBe(batchId);
    });

    it('should throw NotFoundException when batch not found', async () => {
      mockBatchJobRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelBatch(warehouseId, batchId, cancelReq),
      ).rejects.toThrow(NotFoundException);

      expect(batchJobRepository.findOne).toHaveBeenCalledWith({
        where: { batch_job_id: batchId, warehouse_id: warehouseId },
      });
      expect(batchJobRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when batch is not in pending state', async () => {
      const nonPendingBatch = {
        ...mockBatchJob,
        status: 'completed',
      };
      mockBatchJobRepository.findOne.mockResolvedValue(nonPendingBatch);

      await expect(
        service.cancelBatch(warehouseId, batchId, cancelReq),
      ).rejects.toThrow(ConflictException);

      expect(batchJobRepository.remove).not.toHaveBeenCalled();
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
      batch_job: mockBatchJob,
      status: 'pending',
    };

    it('should successfully cancel a task', async () => {
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
      expect(taskRepository.remove).toHaveBeenCalledWith(mockTask);
      expect(result.status).toBe('success');
      expect(result.task_id).toBe(taskId);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelTask(warehouseId, batchId, taskId, cancelReq),
      ).rejects.toThrow(NotFoundException);

      expect(taskRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when task is not in pending state', async () => {
      const nonPendingTask = {
        ...mockTask,
        status: 'completed',
      };
      mockTaskRepository.findOne.mockResolvedValue(nonPendingTask);

      await expect(
        service.cancelTask(warehouseId, batchId, taskId, cancelReq),
      ).rejects.toThrow(ConflictException);

      expect(taskRepository.remove).not.toHaveBeenCalled();
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

    it('should handle empty expression', () => {
      const input = { data: 'test' };

      const [success, value, error] = service.unstructureHelper(input, '');

      expect(success).toBe(true);
      expect(value).toBeNull();
      expect(error).toBeNull();
    });

    it('should handle array index access', () => {
      const input = {
        items: ['first', 'second', 'third'],
      };

      const [success, value, error] = service.unstructureHelper(
        input,
        'input.items[1]',
      );

      expect(success).toBe(true);
      expect(value).toBe('second');
      expect(error).toBeNull();
    });

    it('should handle invalid array index', () => {
      const input = {
        items: ['first', 'second'],
      };

      const [success, value, error] = service.unstructureHelper(
        input,
        'input.items[5]',
      );

      expect(success).toBe(false);
      expect(value).toBeNull();
      expect(error).toBe('items[5]');
    });

    it('should handle null/undefined in path', () => {
      const input = {
        data: null,
      };

      const [success, value, error] = service.unstructureHelper(
        input,
        'input.data.nested',
      );

      expect(success).toBe(false);
      expect(value).toBeNull();
      expect(error).toBe('nested');
    });
  });

  describe('createUnstructuredTask', () => {
    const warehouseId = 'WH_001';
    const mockConfig = {
      object_type: 'object',
      batch_job_id: { path: 'input.batchId' },
      tasks: {
        object_type: 'array',
        source: 'input.taskList',
        map: {
          object_type: 'object',
          task_id: { path: 'item.id' },
        },
      },
    };

    const mockInput = {
      batchId: 'BATCH_001',
      taskList: [{ id: 'TASK_001' }],
    };

    it('should successfully create unstructured task', async () => {
      mockValidator.validate.mockResolvedValue([]);

      const createTaskSpy = jest
        .spyOn(service, 'createTask')
        .mockResolvedValue({
          batch_id: 'BATCH_001',
          status: 'success',
        });

      const result = await service.createUnstructuredTask(
        warehouseId,
        mockConfig,
        mockInput,
      );

      expect(result.status).toBe('success');
      expect(createTaskSpy).toHaveBeenCalled();

      createTaskSpy.mockRestore();
    });

    it('should throw BadRequestException when transformation produces invalid structure', async () => {
      mockValidator.validate.mockResolvedValue([
        { property: 'test', constraints: {} },
      ]);

      await expect(
        service.createUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when config not found', async () => {
      const error = new Error('Config not found');
      (error as any).code = 'ENOENT';

      jest.spyOn(service, '_genericTaskTransformer').mockRejectedValue(error);

      await expect(
        service.createUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(NotFoundException);
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
      warehouse_name: 'Main Warehouse',
      webhook_url: null,
    };

    it('should successfully update webhook', async () => {
      const updatedWarehouse = {
        ...mockWarehouse,
        webhook_url: updateWebhookDto.webhook_url,
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseRepository.save.mockResolvedValue(updatedWarehouse);

      const result = await service.updateWebhook(warehouseId, updateWebhookDto);

      expect(warehouseRepository.findOne).toHaveBeenCalledWith({
        where: { warehouse_id: warehouseId },
      });
      expect(warehouseRepository.save).toHaveBeenCalledWith({
        ...mockWarehouse,
        webhook_url: updateWebhookDto.webhook_url,
      });
      expect(result.status).toBe('success');
      expect(result.warehouse.webhook_url).toBe(updateWebhookDto.webhook_url);
    });

    it('should throw NotFoundException when warehouse not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateWebhook(warehouseId, updateWebhookDto),
      ).rejects.toThrow(NotFoundException);

      expect(warehouseRepository.save).not.toHaveBeenCalled();
    });

    it('should handle clearing webhook URL', async () => {
      const clearWebhookDto = { webhook_url: null };
      const updatedWarehouse = {
        ...mockWarehouse,
        webhook_url: null,
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseRepository.save.mockResolvedValue(updatedWarehouse);

      const result = await service.updateWebhook(warehouseId, clearWebhookDto);

      expect(result.status).toBe('success');
      expect(result.warehouse.webhook_url).toBeNull();
    });

    it('should throw BadRequestException when save fails', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);
      mockWarehouseRepository.save.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateWebhook(warehouseId, updateWebhookDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getLocations', () => {
    const warehouseId = 'WH_001';
    const getLocationReq: GetLocationReq = {
      location_status: LocationStatus.Empty,
      location_zone: 'ZONE_A',
      location_type: GetLocationLocationType.Pallet,
      location_level: '1',
      location_limit: 10,
    };

    const mockWarehouse = {
      id: 'warehouse-uuid-1',
      warehouse_id: warehouseId,
      locations_customer_managed: false,
    };

    const mockConfig = {
      endpoint: {
        url: 'https://api.example.com/locations',
        headers: { 'Content-Type': 'application/json' },
      },
      request: {
        path_params: {},
        query_params: {},
        body: {},
      },
      response: {
        body: {},
      },
    };

    it('should throw BadRequestException when warehouse not found', async () => {
      mockWarehouseRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getLocations(warehouseId, getLocationReq, mockConfig),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return dummy response for customer managed locations', async () => {
      const customerManagedWarehouse = {
        ...mockWarehouse,
        locations_customer_managed: true,
      };
      mockWarehouseRepository.findOne.mockResolvedValue(
        customerManagedWarehouse,
      );

      const result = await service.getLocations(
        warehouseId,
        getLocationReq,
        mockConfig,
      );

      expect(result).toHaveProperty('zone_id');
      expect(result).toHaveProperty('available_location_types');
      expect(result.zone_id).toBe('zone-1');
    });

    it('should return dummy response regardless of config', async () => {
      const invalidConfig = {
        ...mockConfig,
        request: {
          ...mockConfig.request,
          path_params: undefined,
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);

      const result = await service.getLocations(
        warehouseId,
        getLocationReq,
        invalidConfig,
      );

      expect(result).toHaveProperty('zone_id');
      expect(result).toHaveProperty('available_location_types');
      expect(result.zone_id).toBe('zone-1');
    });
  });

  describe('_genericTaskTransformer', () => {
    it('should handle null input gracefully', async () => {
      const result = await service._genericTaskTransformer({}, null);
      expect(result).toBeNull();
    });

    it('should handle null mapping gracefully', async () => {
      const result = await service._genericTaskTransformer(null, {
        data: 'test',
      });
      expect(result).toBeNull();
    });

    it('should transform object type correctly', async () => {
      const mapping = {
        object_type: 'object',
        name: { path: 'input.name' },
        value: { path: 'input.value' },
      };

      const input = {
        name: 'test',
        value: 42,
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual({
        name: 'test',
        value: 42,
      });
    });

    it('should transform array type correctly', async () => {
      const mapping = {
        object_type: 'array',
        source: 'input.items',
        map: {
          object_type: 'object',
          id: { path: 'item.id' },
          name: { path: 'item.name' },
        },
      };

      const input = {
        items: [
          { id: 1, name: 'First' },
          { id: 2, name: 'Second' },
        ],
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual([
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' },
      ]);
    });

    it('should handle type conversions', async () => {
      const mapping = {
        object_type: 'object',
        stringValue: { path: 'input.number', object_type: 'string' },
        numberValue: { path: 'input.string', object_type: 'number' },
        booleanValue: { path: 'input.flag', object_type: 'boolean' },
        nullValue: { path: 'input.anything', object_type: 'null' },
      };

      const input = {
        number: 123,
        string: '456',
        flag: 'true',
        anything: 'ignored',
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual({
        stringValue: '123',
        numberValue: 456,
        booleanValue: true,
        nullValue: null,
      });
    });

    it('should handle default values when path not found', async () => {
      const mapping = {
        object_type: 'object',
        value: { path: 'input.nonexistent', default: 'default_value' },
        noDefault: { path: 'input.missing' },
      };

      const input = {};

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual({
        value: 'default_value',
        noDefault: null,
      });
    });

    it('should handle empty arrays in array transformation', async () => {
      const mapping = {
        object_type: 'array',
        source: 'input.items',
        map: {
          object_type: 'object',
          id: { path: 'item.id' },
        },
      };

      const input = {
        items: [],
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual([]);
    });

    it('should handle missing source in array transformation', async () => {
      const mapping = {
        object_type: 'array',
        source: 'input.nonexistent',
        map: {
          object_type: 'object',
          id: { path: 'item.id' },
        },
      };

      const input = {};

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual([]);
    });

    it('should handle nested object transformations', async () => {
      const mapping = {
        object_type: 'object',
        user: {
          object_type: 'object',
          name: { path: 'input.user.name' },
          details: {
            object_type: 'object',
            age: { path: 'input.user.age' },
            email: { path: 'input.user.email' },
          },
        },
      };

      const input = {
        user: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
        },
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual({
        user: {
          name: 'John Doe',
          details: {
            age: 30,
            email: 'john@example.com',
          },
        },
      });
    });

    it('should handle array of objects with nested transformations', async () => {
      const mapping = {
        object_type: 'array',
        source: 'input.users',
        map: {
          object_type: 'object',
          name: { path: 'item.name' },
          profile: {
            object_type: 'object',
            age: { path: 'item.age' },
            city: { path: 'item.address.city' },
          },
        },
      };

      const input = {
        users: [
          {
            name: 'Alice',
            age: 25,
            address: { city: 'New York' },
          },
          {
            name: 'Bob',
            age: 35,
            address: { city: 'San Francisco' },
          },
        ],
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual([
        {
          name: 'Alice',
          profile: {
            age: 25,
            city: 'New York',
          },
        },
        {
          name: 'Bob',
          profile: {
            age: 35,
            city: 'San Francisco',
          },
        },
      ]);
    });

    it('should handle complex nested arrays', async () => {
      const mapping = {
        object_type: 'object',
        tasks: {
          object_type: 'array',
          source: 'input.batches',
          map: {
            object_type: 'array',
            source: 'item.tasks',
            map: {
              object_type: 'object',
              id: { path: 'item.id' },
              name: { path: 'item.name' },
            },
          },
        },
      };

      const input = {
        batches: [
          {
            tasks: [
              { id: 1, name: 'Task 1' },
              { id: 2, name: 'Task 2' },
            ],
          },
          {
            tasks: [{ id: 3, name: 'Task 3' }],
          },
        ],
      };

      const result = await service._genericTaskTransformer(mapping, input);

      expect(result).toEqual({
        tasks: [
          [
            { id: 1, name: 'Task 1' },
            { id: 2, name: 'Task 2' },
          ],
          [{ id: 3, name: 'Task 3' }],
        ],
      });
    });
  });

  describe('cancelUnstructuredBatch', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const mockConfig = {
      object_type: 'object',
      reason: { path: 'input.reason' },
    };
    const mockInput = { reason: 'Test cancellation' };

    it('should successfully cancel unstructured batch', async () => {
      mockValidator.validate.mockResolvedValue([]);

      const cancelBatchSpy = jest
        .spyOn(service, 'cancelBatch')
        .mockResolvedValue({
          batch_id: batchId,
          status: 'success',
          message: 'Batch cancelled',
          cancelled_at: '2024-01-01T00:00:00Z',
        });

      const result = await service.cancelUnstructuredBatch(
        warehouseId,
        batchId,
        mockConfig,
        mockInput,
      );

      expect(result.status).toBe('success');
      expect(cancelBatchSpy).toHaveBeenCalled();

      cancelBatchSpy.mockRestore();
    });

    it('should throw BadRequestException when transformation fails validation', async () => {
      mockValidator.validate.mockResolvedValue([
        { property: 'reason', constraints: {} },
      ]);

      await expect(
        service.cancelUnstructuredBatch(
          warehouseId,
          batchId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when config not found', async () => {
      const error = new Error('Config not found');
      (error as any).code = 'ENOENT';

      jest.spyOn(service, '_genericTaskTransformer').mockRejectedValue(error);

      await expect(
        service.cancelUnstructuredBatch(
          warehouseId,
          batchId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other transformation errors', async () => {
      jest
        .spyOn(service, '_genericTaskTransformer')
        .mockRejectedValue(new Error('Transformation failed'));

      await expect(
        service.cancelUnstructuredBatch(
          warehouseId,
          batchId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelUnstructuredTask', () => {
    const warehouseId = 'WH_001';
    const batchId = 'BATCH_001';
    const taskId = 'TASK_001';
    const mockConfig = {
      object_type: 'object',
      reason: { path: 'input.reason' },
    };
    const mockInput = { reason: 'Test cancellation' };

    it('should successfully cancel unstructured task', async () => {
      mockValidator.validate.mockResolvedValue([]);

      const cancelTaskSpy = jest
        .spyOn(service, 'cancelTask')
        .mockResolvedValue({
          task_id: taskId,
          status: 'success',
          message: 'Task cancelled',
          cancelled_at: '2024-01-01T00:00:00Z',
        });

      const result = await service.cancelUnstructuredTask(
        warehouseId,
        batchId,
        taskId,
        mockConfig,
        mockInput,
      );

      expect(result.status).toBe('success');
      expect(cancelTaskSpy).toHaveBeenCalled();

      cancelTaskSpy.mockRestore();
    });

    it('should throw BadRequestException when transformation fails validation', async () => {
      mockValidator.validate.mockResolvedValue([
        { property: 'reason', constraints: {} },
      ]);

      await expect(
        service.cancelUnstructuredTask(
          warehouseId,
          batchId,
          taskId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when config not found', async () => {
      const error = new Error('Config not found');
      (error as any).code = 'ENOENT';

      jest.spyOn(service, '_genericTaskTransformer').mockRejectedValue(error);

      await expect(
        service.cancelUnstructuredTask(
          warehouseId,
          batchId,
          taskId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other transformation errors', async () => {
      jest
        .spyOn(service, '_genericTaskTransformer')
        .mockRejectedValue(new Error('Transformation failed'));

      await expect(
        service.cancelUnstructuredTask(
          warehouseId,
          batchId,
          taskId,
          mockConfig,
          mockInput,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateUnstructuredTask', () => {
    const warehouseId = 'WH_001';
    const mockConfig = {
      object_type: 'object',
      batch_job_id: { path: 'input.batchId' },
    };
    const mockInput = { batchId: 'BATCH_001' };

    it('should successfully update unstructured task', async () => {
      mockValidator.validate.mockResolvedValue([]);

      const updateTaskSpy = jest
        .spyOn(service, 'updateTask')
        .mockResolvedValue({
          batch_id: 'BATCH_001',
          status: 'success',
          updated_at: '2024-01-01T00:00:00Z',
          message: 'Updated successfully',
        });

      const result = await service.updateUnstructuredTask(
        warehouseId,
        mockConfig,
        mockInput,
      );

      expect(result.status).toBe('success');
      expect(updateTaskSpy).toHaveBeenCalled();

      updateTaskSpy.mockRestore();
    });

    it('should throw HttpException when validation fails', async () => {
      mockValidator.validate.mockResolvedValue([
        { property: 'batch_job_id', constraints: {} },
      ]);

      await expect(
        service.updateUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(HttpException);
    });

    it('should throw BadRequestException when update service returns error', async () => {
      mockValidator.validate.mockResolvedValue([]);

      const updateTaskSpy = jest
        .spyOn(service, 'updateTask')
        .mockRejectedValue(new Error('error'));

      await expect(
        service.updateUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(HttpException);

      updateTaskSpy.mockRestore();
    });

    it('should throw NotFoundException when config not found', async () => {
      const error = new Error('Config not found');
      (error as any).code = 'ENOENT';

      jest.spyOn(service, '_genericTaskTransformer').mockRejectedValue(error);

      await expect(
        service.updateUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw HttpException for other errors', async () => {
      jest
        .spyOn(service, '_genericTaskTransformer')
        .mockRejectedValue(new Error('General error'));

      await expect(
        service.updateUnstructuredTask(warehouseId, mockConfig, mockInput),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty arrays gracefully in createTask', async () => {
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

    it('should handle malformed location data in updateLocation', async () => {
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

      mockBatchJobRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'existing',
          batch_job_id: 'BATCH_CONCURRENT',
        });

      const mockBatch = { id: 'batch-1', batch_job_id: 'BATCH_CONCURRENT' };
      mockBatchJobRepository.create.mockReturnValue(mockBatch);
      mockBatchJobRepository.save.mockResolvedValue(mockBatch);
      mockTaskRepository.create.mockReturnValue({ id: 'task-1' });
      mockTaskRepository.save.mockResolvedValue({ id: 'task-1' });

      const result1 = await service.createTask('WH_001', taskDto);
      expect(result1.status).toBe('success');

      await expect(service.createTask('WH_001', taskDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should handle database connection errors gracefully', async () => {
      const taskDto: TaskGenerationReq = {
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
            cargos: [{ cargo_code: 'CARGO_001' }],
          },
        ],
      };

      mockBatchJobRepository.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.createTask('WH_001', taskDto)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle invalid wait conditions properly', async () => {
      const taskWithInvalidWait: TaskGenerationReq = {
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
            cargos: [{ cargo_code: 'CARGO_001' }],
            wait: {
              wait_type: WaitType.Conditional,
            } as any,
          },
        ],
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockBatchJobRepository.findOne.mockResolvedValue(null);
      const mockBatch = { id: 'batch-1', batch_job_id: 'BATCH_001' };
      mockBatchJobRepository.create.mockReturnValue(mockBatch);
      mockBatchJobRepository.save.mockResolvedValue(mockBatch);
      mockTaskRepository.create.mockReturnValue({ id: 'task-1' });
      mockTaskRepository.save.mockResolvedValue({ id: 'task-1' });

      const result = await service.createTask('WH_001', taskWithInvalidWait);

      expect(result.status).toBe('success');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle transformation errors in unstructured methods', async () => {
      const mockConfig = { invalid: 'config' };
      const mockInput = { data: 'test' };

      jest
        .spyOn(service, '_genericTaskTransformer')
        .mockRejectedValue(new Error('Transformation failed'));

      await expect(
        service.createUnstructuredTask('WH_001', mockConfig, mockInput),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return dummy response even for non-customer managed warehouses', async () => {
      const mockWarehouse = {
        id: 'warehouse-uuid-1',
        warehouse_id: 'WH_001',
        locations_customer_managed: false,
      };

      const mockConfig = {
        endpoint: {
          url: 'https://api.example.com/locations',
          headers: { 'Content-Type': 'application/json' },
        },
        request: {
          path_params: {},
          query_params: {},
          body: {},
        },
        response: {
          body: {},
        },
      };

      mockWarehouseRepository.findOne.mockResolvedValue(mockWarehouse);

      const getLocationReq: GetLocationReq = {
        location_status: LocationStatus.Empty,
        location_zone: 'ZONE_A',
        location_type: GetLocationLocationType.Pallet,
        location_level: '1',
        location_limit: 10,
      };

      const result = await service.getLocations(
        'WH_001',
        getLocationReq,
        mockConfig,
      );

      expect(result).toHaveProperty('zone_id');
      expect(result).toHaveProperty('available_location_types');
      expect(result.zone_id).toBe('zone-1');
    });
  });
});
