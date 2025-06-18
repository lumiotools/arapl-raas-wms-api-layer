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
  const create_task_config = 'src/config_mapping/test/create_task.json';

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

  describe('transformer',()=>{
    it('transformer: all object_types are null, response should be null', async () => {
      const mapping = {
        "object_type": "null",
        "batch_job_id": {"object_type": "null", "path": "input.batch_job_id"},
        "batch_priority": {"object_type": "null", "path": "input.batch_priority"},
        "batch_type": {"object_type": "null", "path": "input.batch_type"},
        "batch_frequency": {"object_type": "null", "path": "input.batch_frequency"},
        "warehouse_id": {"object_type": "null", "path": "input.warehouse_id"},
        "tasks": {
          "object_type": "null",
          "source": "input.tasks",
          "map": {
            "object_type": "null",
            "task_id": {"object_type": "null", "path": "op.task_id"},
            "task_type": {"object_type": "null", "path": "op.type"},
            "task_pallet_id": {"object_type": "null", "path": "op.task_pallet_id"},
            "task_dependency": {"object_type": "null", "path": "op.task_dependency"},
            "start_location": {
              "object_type": "null",
              "location_id": {"object_type": "null", "path": "op.start_location.location_id"},
              "location_action": {"object_type": "null", "path": "op.start_location.location_action"},
              "location_zone": {"object_type": "null", "path": "op.start_location.location_zone"},
              "location_dimension": {
                "object_type": "null",
                "length": {"object_type": "null", "path": "op.start_location.location_dimension.length"},
                "width": {"object_type": "null", "path": "op.start_location.location_dimension.width"},
                "height": {"object_type": "null", "path": "op.start_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "null",
                "attribute_name": {"object_type": "null", "path": "op.start_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "null", "path": "op.start_location.location_attribute.attribute_value"}
              }
            },
            "end_location": {
              "object_type": "null",
              "location_id": {"object_type": "null", "path": "op.end_location.location_id"},
              "location_action": {"object_type": "null", "path": "op.end_location.location_action"},
              "location_zone": {"object_type": "null", "path": "op.end_location.location_zone"},
              "location_dimension": {
                "object_type": "null",
                "length": {"object_type": "null", "path": "op.end_location.location_dimension.length"},
                "width": {"object_type": "null", "path": "op.end_location.location_dimension.width"},
                "height": {"object_type": "null", "path": "op.end_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "null",
                "attribute_name": {"object_type": "null", "path": "op.end_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "null", "path": "op.end_location.location_attribute.attribute_value"}
              }
            },
            "wait_time": {
              "object_type": "null",
              "wait_type": {"object_type": "null", "path": "op.wait_time.wait_type"},
              "start_location_wait_time": {"object_type": "null", "path": "op.wait_time.start_location_wait_time"},
              "end_location_wait_time": {"object_type": "null", "path": "op.wait_time.end_location_wait_time"}
            },
            "cargos": {
              "object_type": "null",
              "source": "op.cargos",
              "map": {
                "object_type": "null",
                "cargo_code": {"object_type": "null", "path": "item.cargo_code"},
                "cargo_type": {"object_type": "null", "path": "item.cargo_type"},
                "cargo_dimension": {
                  "object_type": "null",
                  "length": {"object_type": "null", "path": "item.cargo_dimension.length"},
                  "width": {"object_type": "null", "path": "item.cargo_dimension.width"},
                  "height": {"object_type": "null", "path": "item.cargo_dimension.height"}
                },
                "cargo_weight": {"object_type": "null", "path": "item.cargo_weight"},
                "cargo_attributes": {
                  "object_type": "null",
                  "attribute_name": {"object_type": "null", "path": "item.cargo_attributes.attribute_name"},
                  "attribute_value": {"object_type": "null", "path": "item.cargo_attributes.attribute_value"}
                }
              }
            }
          }
        }
      }

      const input = {
        "batch_job_id": "BATCH-20240617-001",
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "start_location": {
              "location_id": "LOC-001",
              "location_action": "Pick",
              "location_zone": "ZONE-1",
              "location_dimension": {
                "length": null,
                "width": null,
                "height": null
              },
              "location_attribute": {
                "attribute_name": "Temperature",
                "attribute_value": "Cold"
              }
            },
            "end_location": {
              "location_id": "LOC-002",
              "location_action": "Drop",
              "location_zone": "ZONE-2",
              "location_dimension": {
                "length": 100,
                "width": 80,
                "height": 60
              },
              "location_attribute": {
                "attribute_name": "Humidity",
                "attribute_value": "Low"
              }
            },
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const transformed = await service._genericTaskTransformer(mapping, input);
      
      expect(transformed).toEqual(null);
    });

    it('transforer: all object types are null, except the first one, all fields should be null', async ()=>{
      const mapping = {
        "object_type": "object",
        "batch_job_id": {"object_type": "null", "path": "input.batch_job_id"},
        "batch_priority": {"object_type": "null", "path": "input.batch_priority"},
        "batch_type": {"object_type": "null", "path": "input.batch_type"},
        "batch_frequency": {"object_type": "null", "path": "input.batch_frequency"},
        "warehouse_id": {"object_type": "null", "path": "input.warehouse_id"},
        "tasks": {
          "object_type": "null",
          "source": "input.tasks",
          "map": {
            "object_type": "null",
            "task_id": {"object_type": "null", "path": "op.task_id"},
            "task_type": {"object_type": "null", "path": "op.type"},
            "task_pallet_id": {"object_type": "null", "path": "op.task_pallet_id"},
            "task_dependency": {"object_type": "null", "path": "op.task_dependency"},
            "start_location": {
              "object_type": "null",
              "location_id": {"object_type": "null", "path": "op.start_location.location_id"},
              "location_action": {"object_type": "null", "path": "op.start_location.location_action"},
              "location_zone": {"object_type": "null", "path": "op.start_location.location_zone"},
              "location_dimension": {
                "object_type": "null",
                "length": {"object_type": "null", "path": "op.start_location.location_dimension.length"},
                "width": {"object_type": "null", "path": "op.start_location.location_dimension.width"},
                "height": {"object_type": "null", "path": "op.start_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "null",
                "attribute_name": {"object_type": "null", "path": "op.start_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "null", "path": "op.start_location.location_attribute.attribute_value"}
              }
            },
            "end_location": {
              "object_type": "null",
              "location_id": {"object_type": "null", "path": "op.end_location.location_id"},
              "location_action": {"object_type": "null", "path": "op.end_location.location_action"},
              "location_zone": {"object_type": "null", "path": "op.end_location.location_zone"},
              "location_dimension": {
                "object_type": "null",
                "length": {"object_type": "null", "path": "op.end_location.location_dimension.length"},
                "width": {"object_type": "null", "path": "op.end_location.location_dimension.width"},
                "height": {"object_type": "null", "path": "op.end_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "null",
                "attribute_name": {"object_type": "null", "path": "op.end_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "null", "path": "op.end_location.location_attribute.attribute_value"}
              }
            },
            "wait_time": {
              "object_type": "null",
              "wait_type": {"object_type": "null", "path": "op.wait_time.wait_type"},
              "start_location_wait_time": {"object_type": "null", "path": "op.wait_time.start_location_wait_time"},
              "end_location_wait_time": {"object_type": "null", "path": "op.wait_time.end_location_wait_time"}
            },
            "cargos": {
              "object_type": "null",
              "source": "op.cargos",
              "map": {
                "object_type": "null",
                "cargo_code": {"object_type": "null", "path": "item.cargo_code"},
                "cargo_type": {"object_type": "null", "path": "item.cargo_type"},
                "cargo_dimension": {
                  "object_type": "null",
                  "length": {"object_type": "null", "path": "item.cargo_dimension.length"},
                  "width": {"object_type": "null", "path": "item.cargo_dimension.width"},
                  "height": {"object_type": "null", "path": "item.cargo_dimension.height"}
                },
                "cargo_weight": {"object_type": "null", "path": "item.cargo_weight"},
                "cargo_attributes": {
                  "object_type": "null",
                  "attribute_name": {"object_type": "null", "path": "item.cargo_attributes.attribute_name"},
                  "attribute_value": {"object_type": "null", "path": "item.cargo_attributes.attribute_value"}
                }
              }
            }
          }
        }
      }

      const input = {
        "batch_job_id": "BATCH-20240617-001",
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "start_location": {
              "location_id": "LOC-001",
              "location_action": "Pick",
              "location_zone": "ZONE-1",
              "location_dimension": {
                "length": null,
                "width": null,
                "height": null
              },
              "location_attribute": {
                "attribute_name": "Temperature",
                "attribute_value": "Cold"
              }
            },
            "end_location": {
              "location_id": "LOC-002",
              "location_action": "Drop",
              "location_zone": "ZONE-2",
              "location_dimension": {
                "length": 100,
                "width": 80,
                "height": 60
              },
              "location_attribute": {
                "attribute_name": "Humidity",
                "attribute_value": "Low"
              }
            },
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const expectedResponse = {
        "batch_job_id": null,
        "batch_priority": null,
        "batch_type": null,
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": null
      }

      const transformed  = await service._genericTaskTransformer(mapping, input);

      expect(transformed).toEqual(expectedResponse);

    });

    it('transformer: extract batch_job_id from a list of batch_jobs', async ()=>{
      const mapping = {
        "object_type": "object",
        "batch_job_id": {"object_type": "string", "path":"input.batch_jobs[0].batch_job_id"}, 
        "batch_priority": {"object_type": "number", "path": "input.batch_priority"},
        "batch_type": {"object_type": "string", "path": "input.batch_type"},
        "batch_frequency": {"object_type": "null", "path": "input.batch_frequency"},
        "warehouse_id": {"object_type": "null", "path": "input.warehouse_id"},
        "tasks": {
          "object_type": "array",
          "source": "input.tasks",
          "map": {
            "object_type": "object",
            "task_id": {"object_type":"string", "path": "op.task_id"},
            "task_type": {"object_type":"string", "path": "op.type"},
            "task_pallet_id": {"object_type":"string", "path": "op.task_pallet_id"},
            "task_dependency": {"object_type":"null", "path": "op.task_dependency"},

            "start_location": {
              "object_type": "object",
              "location_id": {"object_type": "string", "path": "op.start_location.location_id"},
              "location_action": {"object_type": "string", "path": "op.start_location.location_action"},
              "location_zone": {"object_type": "string", "path": "op.start_location.location_zone"},
              "location_dimension": {
                "object_type": "object",
                "length": {"object_type": "null", "path": "op.start_location.location_dimension.length"},
                "width": {"object_type": "null", "path": "op.start_location.location_dimension.width"},
                "height": {"object_type": "null", "path": "op.start_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "object",
                "attribute_name": {"object_type": "string", "path": "op.start_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "string", "path": "op.start_location.location_attribute.attribute_value"}
              }
            },

            "end_location": {
              "object_type": "object",
              "location_id": {"object_type": "string", "path": "op.end_location.location_id"},
              "location_action": {"object_type": "string", "path": "op.end_location.location_action"},
              "location_zone": {"object_type": "string", "path": "op.end_location.location_zone"},
              "location_dimension": {
                "object_type": "object",
                "length": {"object_type": "number", "path": "op.end_location.location_dimension.length"},
                "width": {"object_type": "number", "path": "op.end_location.location_dimension.width"},
                "height": {"object_type": "number", "path": "op.end_location.location_dimension.height"}
              },
              "location_attribute": {
                "object_type": "object",
                "attribute_name": {"object_type": "string", "path": "op.end_location.location_attribute.attribute_name"},
                "attribute_value": {"object_type": "string", "path": "op.end_location.location_attribute.attribute_value"}
              }
            },
            "wait_time": {
              "object_type": "object",
              "wait_type": {"object_type": "null", "path": "op.wait_time.wait_type"},
              "start_location_wait_time": {"object_type": "null", "path": "op.wait_time.start_location_wait_time"},
              "end_location_wait_time": {"object_type": "null", "path": "op.wait_time.end_location_wait_time"}
            },
            "cargos": {
              "object_type": "array",
              "source": "op.cargos",
              "map": {
                "object_type": "object",
                "cargo_code": {"object_type": "string", "path": "item.cargo_code"},
                "cargo_type": {"object_type": "string", "path": "item.cargo_type"},
                "cargo_dimension": {
                  "object_type": "object",
                  "length": {"object_type": "null", "path": "item.cargo_dimension.length"},
                  "width": {"object_type": "null", "path": "item.cargo_dimension.width"},
                  "height": {"object_type": "null", "path": "item.cargo_dimension.height"}
                },
                "cargo_weight": {"object_type": "number", "path": "item.cargo_weight"},
                "cargo_attributes": {
                  "object_type": "object",
                  "attribute_name": {"object_type": "null", "path": "item.cargo_attributes.attribute_name"},
                  "attribute_value": {"object_type": "null", "path": "item.cargo_attributes.attribute_value"}
                }
              }
            }
          }
        }
      }

      const input = {
        "batch_jobs": [{"batch_job_id": "BATCH-20240617-001"}, {"batch_job_id": "BATCH-20240617-002"}],
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "start_location": {
              "location_id": "LOC-001",
              "location_action": "Pick",
              "location_zone": "ZONE-1",
              "location_dimension": {
                "length": null,
                "width": null,
                "height": null
              },
              "location_attribute": {
                "attribute_name": "Temperature",
                "attribute_value": "Cold"
              }
            },
            "end_location": {
              "location_id": "LOC-002",
              "location_action": "Drop",
              "location_zone": "ZONE-2",
              "location_dimension": {
                "length": 100,
                "width": 80,
                "height": 60
              },
              "location_attribute": {
                "attribute_name": "Humidity",
                "attribute_value": "Low"
              }
            },
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const expectedResponse = {
        "batch_job_id": "BATCH-20240617-001",
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "task_type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "start_location": {
              "location_id": "LOC-001",
              "location_action": "Pick",
              "location_zone": "ZONE-1",
              "location_dimension": {
                "length": null,
                "width": null,
                "height": null
              },
              "location_attribute": {
                "attribute_name": "Temperature",
                "attribute_value": "Cold"
              }
            },
            "end_location": {
              "location_id": "LOC-002",
              "location_action": "Drop",
              "location_zone": "ZONE-2",
              "location_dimension": {
                "length": 100,
                "width": 80,
                "height": 60
              },
              "location_attribute": {
                "attribute_name": "Humidity",
                "attribute_value": "Low"
              }
            },
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const transformed = await service._genericTaskTransformer(mapping, input);
      expect(transformed).toEqual(expectedResponse);

    });

    it ("transformer: start_location and endlocation are not present as objects, they are part of task object",async ()=>{
      const mapping = {
        "object_type": "object",
        "batch_job_id": {"object_type": "string", "path":"input.batch_jobs[0].batch_job_id"}, 
        "batch_priority": {"object_type": "number", "path": "input.batch_priority"},
        "batch_type": {"object_type": "string", "path": "input.batch_type"},
        "batch_frequency": {"object_type": "null", "path": "input.batch_frequency"},
        "warehouse_id": {"object_type": "null", "path": "input.warehouse_id"},
        "tasks": {
          "object_type": "array",
          "source": "input.tasks",
          "map": {
            "object_type": "object",
            "task_id": {"object_type":"string", "path": "op.task_id"},
            "task_type": {"object_type":"string", "path": "op.type"},
            "task_pallet_id": {"object_type":"string", "path": "op.task_pallet_id"},
            "task_dependency": {"object_type":"null", "path": "op.task_dependency"},

            "start_location_id": {"object_type": "string", "path": "op.start_location.location_id"},
            "start_location_action": {"object_type": "string", "path": "op.start_location.location_action"},
            "start_location_zone": {"object_type": "string", "path": "op.start_location.location_zone"},
            "start_location_dimension": {
              "object_type": "object",
              "length": {"object_type": "null", "path": "op.start_location.location_dimension.length"},
              "width": {"object_type": "null", "path": "op.start_location.location_dimension.width"},
              "height": {"object_type": "null", "path": "op.start_location.location_dimension.height"}
            },
            "start_location_attribute": {
              "object_type": "object",
              "attribute_name": {"object_type": "string", "path": "op.start_location.location_attribute.attribute_name"},
              "attribute_value": {"object_type": "string", "path": "op.start_location.location_attribute.attribute_value"}
            },

            "end_location_id": {"object_type": "string", "path": "op.end_location.location_id"},
            "end_location_action": {"object_type": "string", "path": "op.end_location.location_action"},
            "end_location_zone": {"object_type": "string", "path": "op.end_location.location_zone"},
            "end_location_dimension": {
              "object_type": "object",
              "length": {"object_type": "number", "path": "op.end_location.location_dimension.length"},
              "width": {"object_type": "number", "path": "op.end_location.location_dimension.width"},
              "height": {"object_type": "number", "path": "op.end_location.location_dimension.height"}
            },
            "end_location_attribute": {
              "object_type": "object",
              "attribute_name": {"object_type": "string", "path": "op.end_location.location_attribute.attribute_name"},
              "attribute_value": {"object_type": "string", "path": "op.end_location.location_attribute.attribute_value"}
            },

            "wait_time": {
              "object_type": "object",
              "wait_type": {"object_type": "null", "path": "op.wait_time.wait_type"},
              "start_location_wait_time": {"object_type": "null", "path": "op.wait_time.start_location_wait_time"},
              "end_location_wait_time": {"object_type": "null", "path": "op.wait_time.end_location_wait_time"}
            },
            "cargos": {
              "object_type": "array",
              "source": "op.cargos",
              "map": {
                "object_type": "object",
                "cargo_code": {"object_type": "string", "path": "item.cargo_code"},
                "cargo_type": {"object_type": "string", "path": "item.cargo_type"},
                "cargo_dimension": {
                  "object_type": "object",
                  "length": {"object_type": "null", "path": "item.cargo_dimension.length"},
                  "width": {"object_type": "null", "path": "item.cargo_dimension.width"},
                  "height": {"object_type": "null", "path": "item.cargo_dimension.height"}
                },
                "cargo_weight": {"object_type": "number", "path": "item.cargo_weight"},
                "cargo_attributes": {
                  "object_type": "object",
                  "attribute_name": {"object_type": "null", "path": "item.cargo_attributes.attribute_name"},
                  "attribute_value": {"object_type": "null", "path": "item.cargo_attributes.attribute_value"}
                }
              }
            }
          }
        }
      }

      const input = {
        "batch_jobs": [{"batch_job_id": "BATCH-20240617-001"}, {"batch_job_id": "BATCH-20240617-002"}],
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "start_location": {
              "location_id": "LOC-001",
              "location_action": "Pick",
              "location_zone": "ZONE-1",
              "location_dimension": {
                "length": null,
                "width": null,
                "height": null
              },
              "location_attribute": {
                "attribute_name": "Temperature",
                "attribute_value": "Cold"
              }
            },
            "end_location": {
              "location_id": "LOC-002",
              "location_action": "Drop",
              "location_zone": "ZONE-2",
              "location_dimension": {
                "length": 100,
                "width": 80,
                "height": 60
              },
              "location_attribute": {
                "attribute_name": "Humidity",
                "attribute_value": "Low"
              }
            },
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const expectedResponse = {
        "batch_job_id": "BATCH-20240617-001",
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "task_type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,

            "start_location_id": "LOC-001",
            "start_location_action": "Pick",
            "start_location_zone": "ZONE-1",
            "start_location_dimension": {
              "length": null,
              "width": null,
              "height": null
            },
            "start_location_attribute": {
              "attribute_name": "Temperature",
              "attribute_value": "Cold"
            },
            
            "end_location_id": "LOC-002",
            "end_location_action": "Drop",
            "end_location_zone": "ZONE-2",
            "end_location_dimension": {
              "length": 100,
              "width": 80,
              "height": 60
            },
            "end_location_attribute": {
              "attribute_name": "Humidity",
              "attribute_value": "Low"
            },

            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const transformed = await service._genericTaskTransformer(mapping, input);
      expect(transformed).toEqual(expectedResponse);

    });

    it("transformer: start_location and endlocation present in list, first one should be start and second one should be end", async ()=>{
      const mapping = {
        "object_type": "object",
        "batch_job_id": {"object_type": "string", "path":"input.batch_jobs[0].batch_job_id"}, 
        "batch_priority": {"object_type": "number", "path": "input.batch_priority"},
        "batch_type": {"object_type": "string", "path": "input.batch_type"},
        "batch_frequency": {"object_type": "null", "path": "input.batch_frequency"},
        "warehouse_id": {"object_type": "null", "path": "input.warehouse_id"},
        "tasks": {
          "object_type": "array",
          "source": "input.tasks",
          "map": {
            "object_type": "object",
            "task_id": {"object_type":"string", "path": "op.task_id"},
            "task_type": {"object_type":"string", "path": "op.type"},
            "task_pallet_id": {"object_type":"string", "path": "op.task_pallet_id"},
            "task_dependency": {"object_type":"null", "path": "op.task_dependency"},

            "location":{
              "object_type": "array",
              "source": "op.location",
              "map":{
                "object_type": "object",
                "location_id": {"object_type": "string", "path": "item.location_id"},
                "location_action": {"object_type": "string", "path": "item.location_action"},
                "location_zone": {"object_type": "string", "path": "item.location_zone"},
                "location_dimension": {
                  "object_type": "object",
                  "length": {"object_type": "number", "path": "item.location_dimension.length"},
                  "width": {"object_type": "number", "path": "item.location_dimension.width"},
                  "height": {"object_type": "number", "path": "item.location_dimension.height"}
                },
              }
            },

            "wait_time": {
              "object_type": "object",
              "wait_type": {"object_type": "null", "path": "op.wait_time.wait_type"},
              "start_location_wait_time": {"object_type": "null", "path": "op.wait_time.start_location_wait_time"},
              "end_location_wait_time": {"object_type": "null", "path": "op.wait_time.end_location_wait_time"}
            },
            "cargos": {
              "object_type": "array",
              "source": "op.cargos",
              "map": {
                "object_type": "object",
                "cargo_code": {"object_type": "string", "path": "item.cargo_code"},
                "cargo_type": {"object_type": "string", "path": "item.cargo_type"},
                "cargo_dimension": {
                  "object_type": "object",
                  "length": {"object_type": "null", "path": "item.cargo_dimension.length"},
                  "width": {"object_type": "null", "path": "item.cargo_dimension.width"},
                  "height": {"object_type": "null", "path": "item.cargo_dimension.height"}
                },
                "cargo_weight": {"object_type": "number", "path": "item.cargo_weight"},
                "cargo_attributes": {
                  "object_type": "object",
                  "attribute_name": {"object_type": "null", "path": "item.cargo_attributes.attribute_name"},
                  "attribute_value": {"object_type": "null", "path": "item.cargo_attributes.attribute_value"}
                }
              }
            }
          }
        }
      }

      const input = {
        "batch_jobs": [{"batch_job_id": "BATCH-20240617-001"}, {"batch_job_id": "BATCH-20240617-002"}],
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,
            "location": [
              {
                "location_id": "LOC-001",
                "location_action": "Pick",
                "location_zone": "ZONE-1",
                "location_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "location_attribute": {
                  "attribute_name": "Temperature",
                  "attribute_value": "Cold"
                }
              },
              {
                "location_id": "LOC-002",
                "location_action": "Drop",
                "location_zone": "ZONE-2",
                "location_dimension": {
                  "length": 100,
                  "width": 80,
                  "height": 60
                },
                "location_attribute": {
                  "attribute_name": "Humidity",
                  "attribute_value": "Low"
                }
              }
            ],
            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const expectedResponse = {
        "batch_job_id": "BATCH-20240617-001",
        "batch_priority": 2,
        "batch_type": "Discrete",
        "batch_frequency": null,
        "warehouse_id": null,
        "tasks": [
          {
            "task_id": "TASK-001",
            "task_type": "Pick",
            "task_pallet_id": "PALLET-001",
            "task_dependency": null,

            "location":[
              {
                "location_id": "LOC-001",
                "location_action": "Pick",
                "location_zone": "ZONE-1",
                "location_dimension": {
                  "length": 0,
                  "width": 0,
                  "height": 0
                }
              },
              {
                "location_id": "LOC-002",
                "location_action": "Drop",
                "location_zone": "ZONE-2",
                "location_dimension": {
                  "length": 100,
                  "width": 80,
                  "height": 60
                }
              }
            ],

            "wait_time": {
              "wait_type": null,
              "start_location_wait_time": null,
              "end_location_wait_time": null
            },
            "cargos": [
              {
                "cargo_code": "CARGO-001",
                "cargo_type": "Box",
                "cargo_dimension": {
                  "length": null,
                  "width": null,
                  "height": null
                },
                "cargo_weight": 15.5,
                "cargo_attributes": {
                  "attribute_name": null,
                  "attribute_value": null
                }
              }
            ]
          }
        ]
      }

      const transformed = await service._genericTaskTransformer(mapping, input);
      expect(transformed).toEqual(expectedResponse);
    });


  });
    
  
});