import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, UsingJoinTableIsNotAllowedError } from 'typeorm';
import { RobotJobService } from './robot-job.service';
import { BatchJob } from './entities/batch_task.entity';
import { Task } from './entities/task.entity';
import { Location } from './entities/locations.entity';
import * as fs from 'fs/promises';
import { batch_type, TaskGenerationReq, TaskGenerationRes, TaskType, Wait } from './dto/Task_Generation.dto';

describe('RobotJobService', () => {
  let service: RobotJobService;
  let batchJobRepository: Repository<BatchJob>;
  let taskRepository: Repository<Task>;
  let locationRepository: Repository<Location>;

  beforeEach(async () => {
    const batchJobRepoMock = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      // Add any other methods used in RobotJobService for BatchJob
    };
    const taskRepoMock = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      // Add any other methods used in RobotJobService for Task
    };
    const locationRepoMock = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      // Add any other methods used in RobotJobService for Location
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RobotJobService,
        {
          provide: getRepositoryToken(BatchJob),
          useValue: batchJobRepoMock,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: taskRepoMock,
        },
        {
          provide: getRepositoryToken(Location),
          useValue: locationRepoMock,
        },
      ],
    }).compile();

    service = module.get<RobotJobService>(RobotJobService);
    batchJobRepository = module.get<Repository<BatchJob>>(getRepositoryToken(BatchJob));
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    locationRepository = module.get<Repository<Location>>(getRepositoryToken(Location));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it("Calling- create_task: if start_location doesn't exists - throw an error", async () => {
      const warehouseId = 'test-warehouse';
      const taskGenerationReq: TaskGenerationReq = {
        batch_job_id: 'test-batch-job',
        batch_type: batch_type.Continuous,
        batch_priority: 5,
        tasks: [
          {
            task_id: 'task1',
            task_type: TaskType.Picking,
            start_location: { location_id: 'loc1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            end_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            cargos: [
              { cargo_code: 'cargo1'},
            ],
          },
        ],
      };
      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });
5
      const result = await service.createTask(warehouseId, taskGenerationReq);
      
      expect(result).toEqual({
        "batch_job_id": "test-batch-job",
        "status": "error: Location with id loc1 does not exist",
      });
    });

    it("Calling- create_task: start location is not empty - throw an error", async () => {
      const warehouseId = 'test-warehouse';
      const taskGenerationReq: TaskGenerationReq = {
        batch_job_id: 'test-batch-job',
        batch_type: batch_type.Continuous,
        batch_priority: 5,
        tasks: [
          {
            task_id: 'task1',
            task_type: TaskType.Picking,
            start_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            end_location: { location_id: 'loc2', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            cargos: [
              { cargo_code: 'cargo1'},
            ],
          },
        ],
      };
      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({ location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 }, isEmpty: false } as Location);
      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.createTask(warehouseId, taskGenerationReq);
      
      expect(result).toEqual({
        "batch_job_id": "test-batch-job",
        "status": "error: Location with id ST1-11-1-1 is not in the expected state. Expected: true, Actual: false",
      });
    });


    it("Calling- create_task: combination of batch_job_id and warehouse_id already exists - throw an error", async () => {
      const warehouseId = 'test-warehouse';
      const taskGenerationReq: TaskGenerationReq = {
        batch_job_id: 'test-batch-job',
        batch_type: batch_type.Continuous,
        batch_priority: 5,
        tasks: [
          {
            task_id: 'task1',
            task_type: TaskType.Picking,
            start_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            end_location: { location_id: 'ST1-10-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            cargos: [
              { cargo_code: 'cargo1'},
            ],
          },
        ],
      };

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(locationRepository,'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(batchJobRepository, 'findOne').mockResolvedValueOnce({
        batch_job_id: 'test-batch-job',
        warehouse_id: 'test-warehouse',
      } as BatchJob);

      const result = await service.createTask(warehouseId, taskGenerationReq);
      
      expect(result).toEqual({
        "batch_job_id": "test-batch-job",
        "status": `error: Batch job with id ${taskGenerationReq.batch_job_id} already exists in warehouse ${warehouseId}. Combination of Batch Job ID and Warehouse ID must be unique.`,
      });
    });


    it("Calling- create_task: error during saving batch job object - throw an error", async () => {
      const warehouseId = 'test-warehouse';
      const taskGenerationReq: TaskGenerationReq = {
        batch_job_id: 'test-batch-job',
        batch_type: batch_type.Continuous,
        batch_priority: 5,
        tasks: [
          {
            task_id: 'task1',
            task_type: TaskType.Picking,
            start_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            end_location: { location_id: 'ST1-10-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            cargos: [
              { cargo_code: 'cargo1'},
            ],
          },
        ],
      };

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(locationRepository,'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(batchJobRepository, 'findOne').mockResolvedValueOnce(null);

      jest.spyOn(batchJobRepository, 'save').mockRejectedValueOnce(new Error('Database error'));

      const result = await service.createTask(warehouseId, taskGenerationReq);
      
      expect(result).toEqual({
        "batch_job_id": "test-batch-job",
        "status": `error: Database error`,
      });
    });


    it("Calling- create_task: every thing is correct - create a task", async () => {
      const warehouseId = 'test-warehouse';
      const taskGenerationReq: TaskGenerationReq = {
        batch_job_id: 'test-batch-job',
        batch_type: batch_type.Continuous,
        batch_priority: 5,
        tasks: [
          {
            task_id: 'task1',
            task_type: TaskType.Picking,
            start_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            end_location: { location_id: 'ST1-10-1-1', location_dimension: { length: 1, width: 1, height: 1 } } as Location,
            cargos: [
              { cargo_code: 'cargo1'},
            ],
          },
        ],
      };

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'findOne').mockResolvedValueOnce({
        location_id: 'ST1-11-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(locationRepository,'findOne').mockResolvedValueOnce({
        location_id: 'ST1-10-1-1',
        location_dimension: { length: 1, width: 1, height: 1 },
        isEmpty: true,
      } as Location);

      jest.spyOn(locationRepository, 'update').mockResolvedValueOnce({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      jest.spyOn(batchJobRepository, 'findOne').mockResolvedValueOnce(null);

      jest.spyOn(batchJobRepository, 'create').mockReturnValueOnce({
        batch_job_id: taskGenerationReq.batch_job_id,
        warehouse_id: warehouseId,
        batch_type: taskGenerationReq.batch_type,
        batch_priority: taskGenerationReq.batch_priority,
        status: 'pending'
      } as BatchJob);

      jest.spyOn(taskRepository, 'create').mockReturnValueOnce({
        task_id: taskGenerationReq.tasks[0].task_id,
        task_type: TaskType.Picking,
        start_location: { location_id: 'ST1-11-1-1', location_dimension: { length: 1, width: 1, height: 1 }} as Location,
        end_location: { location_id: 'ST1-10-1-1', location_dimension: { length: 1, width: 1, height: 1 }} as Location,
        cargos: [
          { cargo_code: 'cargo1' },
        ],
        status: 'pending'
      } as unknown as Task);

      jest.spyOn(batchJobRepository, 'save').mockResolvedValueOnce({
        batch_job_id: 'test-batch-job',
        warehouse_id: 'test-warehouse',
        id: 'batch-job-id',
      } as BatchJob);

      jest.spyOn(taskRepository, 'save').mockResolvedValueOnce({
        task_id: 'task1',
        task_type: TaskType.Picking,
      } as Task);

      const result = await service.createTask(warehouseId, taskGenerationReq);
      
      expect(result).toEqual({
        "batch_job_id": "test-batch-job",
        "status": `success`,
      });
    });
    
  });
    
  
});