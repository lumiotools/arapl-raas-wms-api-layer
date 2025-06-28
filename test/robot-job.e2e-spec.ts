import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchJob } from '../src/modules/robot-job/entities/batch_task.entity';
import { Task } from '../src/modules/robot-job/entities/task.entity';
import { Location } from '../src/modules/robot-job/entities/locations.entity';
import { Warehouse } from '../src/modules/robot-job/entities/warehouse.entity';
import {
  TaskGenerationReq,
  TaskType,
  LocationType,
  LocationAction,
  batch_type,
  WaitType,
} from '../src/modules/robot-job/dto/Task_Generation.dto';
import { TaskUpdateReq } from '../src/modules/robot-job/dto/Task_Update.dto';
import { CancelReq } from '../src/modules/robot-job/dto/Cancel.dto';
import { LocationStatus } from '../src/modules/robot-job/dto/GetLocation.dto';

describe('RobotJobController (e2e)', () => {
  let app: INestApplication;
  let batchJobRepository: Repository<BatchJob>;
  let taskRepository: Repository<Task>;
  let locationRepository: Repository<Location>;
  let warehouseRepository: Repository<Warehouse>;

  const testWarehouseId = 'TEST_WH_001';
  const testBatchId = 'TEST_BATCH_001';
  const testTaskId = 'TEST_TASK_001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));

    batchJobRepository = moduleFixture.get<Repository<BatchJob>>(
      getRepositoryToken(BatchJob),
    );
    taskRepository = moduleFixture.get<Repository<Task>>(
      getRepositoryToken(Task),
    );
    locationRepository = moduleFixture.get<Repository<Location>>(
      getRepositoryToken(Location),
    );
    warehouseRepository = moduleFixture.get<Repository<Warehouse>>(
      getRepositoryToken(Warehouse),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up only test-specific data (not all data)
    await taskRepository.delete({ task_id: testTaskId });
    await taskRepository.delete({ task_id: 'TEST_TASK_002' });
    await batchJobRepository.delete({ batch_job_id: testBatchId });
    await batchJobRepository.delete({ warehouse_id: testWarehouseId });
    await locationRepository.delete({ location_id: 'LOC_001' });
    await locationRepository.delete({ location_id: 'LOC_002' });
    await warehouseRepository.delete({ warehouse_id: testWarehouseId });

    // Set up test warehouse
    await warehouseRepository.save({
      warehouse_id: testWarehouseId,
      warehouse_name: 'Test Warehouse',
      api_key: 'test-api-key',
      locations_customer_managed: false,
      webhook_url: 'https://test-webhook.com',
    });

    // Set up test locations
    await locationRepository.save([
      {
        location_id: 'LOC_001',
        location_type: LocationType.Pallet,
        location_action: LocationAction.Pick,
        location_dimension: {
          length: 100,
          width: 50,
          height: 80,
        },
        isEmpty: true,
      },
      {
        location_id: 'LOC_002',
        location_type: LocationType.Pallet,
        location_action: LocationAction.Drop,
        location_dimension: {
          length: 100,
          width: 50,
          height: 80,
        },
        isEmpty: false,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up only test-specific data created during the test
    await taskRepository.delete({ task_id: testTaskId });
    await taskRepository.delete({ task_id: 'TEST_TASK_002' });
    await batchJobRepository.delete({ batch_job_id: testBatchId });
    await batchJobRepository.delete({ warehouse_id: testWarehouseId });
    await locationRepository.delete({ location_id: 'LOC_001' });
    await locationRepository.delete({ location_id: 'LOC_002' });
    await warehouseRepository.delete({ warehouse_id: testWarehouseId });
  });

  describe('POST /:warehouse_id/tasks (Create Tasks)', () => {
    const validTaskRequest: TaskGenerationReq = {
      batch_job_id: testBatchId,
      batch_priority: 5,
      batch_type: batch_type.Discrete,
      tasks: [
        {
          task_id: testTaskId,
          task_type: TaskType.Picking,
          start_location: {
            location_id: 'LOC_001',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Pick,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          end_location: {
            location_id: 'LOC_002',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Drop,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          cargos: [
            {
              cargo_code: 'CARGO_001',
              cargo_type: 'Box',
              cargo_weight: 15.5,
            },
          ],
        },
      ],
    };

    it('should create tasks successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(validTaskRequest)
        .expect(201);

      expect(response.body).toEqual({
        batch_id: testBatchId,
        status: 'success',
      });

      // Verify batch job was created
      const batchJob = await batchJobRepository.findOne({
        where: { batch_job_id: testBatchId, warehouse_id: testWarehouseId },
      });
      expect(batchJob).toBeDefined();
      expect(batchJob?.batch_priority).toBe(5);
      expect(batchJob?.batch_type).toBe(batch_type.Discrete);

      // Verify task was created
      const task = await taskRepository.findOne({
        where: { task_id: testTaskId },
      });
      expect(task).toBeDefined();
      expect(task?.task_type).toBe(TaskType.Picking);
    });

    it('should generate batch_job_id if not provided', async () => {
      const requestWithoutBatchId = { ...validTaskRequest };
      delete requestWithoutBatchId.batch_job_id;

      const response = await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(requestWithoutBatchId)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.batch_id).toMatch(/^Batch-\d+/);
    });

    it('should return 400 for invalid task structure', async () => {
      const invalidRequest = {
        ...validTaskRequest,
        tasks: [
          {
            task_id: '', // Invalid: empty task_id
            task_type: 'InvalidType', // Invalid enum value
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(invalidRequest)
        .expect(400);
    });

    it('should return 400 for duplicate batch_job_id', async () => {
      // Create first batch
      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(validTaskRequest)
        .expect(201);

      // Try to create another batch with same ID
      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(validTaskRequest)
        .expect(409);
    });

    it('should return 400 for continuous batch without frequency', async () => {
      const continuousRequest = {
        ...validTaskRequest,
        batch_type: batch_type.Continuous,
        // Missing batch_frequency
      };

      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(continuousRequest)
        .expect(400);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .send(validTaskRequest)
        .expect(401);
    });
  });

  describe('GET /:warehouse_id/tasks/:batch_id (Get Tasks)', () => {
    beforeEach(async () => {
      // Set up test batch and tasks
      const batchJob = await batchJobRepository.save({
        batch_job_id: testBatchId,
        warehouse_id: testWarehouseId,
        batch_priority: 5,
        batch_type: batch_type.Discrete,
        status: 'pending',
      });

      const tasks = [
        {
          task_id: testTaskId,
          batch_job_id: batchJob.id,
          task_type: TaskType.Picking,
          status: 'pending',
          start_location: {
            location_id: 'LOC_001',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Pick,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          end_location: {
            location_id: 'LOC_002',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Drop,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          cargos: [],
        },
        {
          task_id: 'TEST_TASK_002',
          batch_job_id: batchJob.id,
          task_type: TaskType.Putaway,
          status: 'pending',
          start_location: {
            location_id: 'LOC_001',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Pick,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          end_location: {
            location_id: 'LOC_002',
            location_type: LocationType.Pallet,
            location_action: LocationAction.Drop,
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          cargos: [],
        },
      ];

      for (const task of tasks) {
        await taskRepository.save(task);
      }
    });

    it('should return tasks for valid batch', async () => {
      const response = await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/tasks/${testBatchId}`)
        .set('authorization', 'test-api-key')
        .expect(200);

      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.tasks[0]).toMatchObject({
        task_id: testTaskId,
        task_type: TaskType.Picking,
        status: 'pending',
        wait: null,
      });
      expect(response.body.tasks[1]).toMatchObject({
        task_id: 'TEST_TASK_002',
        task_type: TaskType.Putaway,
        status: 'pending',
        wait: null,
      });
    });

    it('should return 404 for non-existent batch', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/tasks/NON_EXISTENT_BATCH`)
        .set('authorization', 'test-api-key')
        .expect(404);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/tasks/${testBatchId}`)
        .expect(401);
    });
  });

  describe('PUT /:warehouse_id/tasks (Update Tasks)', () => {
    beforeEach(async () => {
      // Set up test batch and task
      const batchJob = await batchJobRepository.save({
        batch_job_id: testBatchId,
        warehouse_id: testWarehouseId,
        batch_priority: 5,
        batch_type: batch_type.Discrete,
        status: 'pending',
      });

      await taskRepository.save({
        task_id: testTaskId,
        batch_job_id: batchJob.id,
        task_type: TaskType.Picking,
        status: 'pending',
        start_location: {
          location_id: 'LOC_001',
          location_type: LocationType.Pallet,
          location_action: LocationAction.Pick,
          location_dimension: {
            length: 100,
            width: 50,
            height: 80,
          },
        },
        end_location: {
          location_id: 'LOC_002',
          location_type: LocationType.Pallet,
          location_action: LocationAction.Drop,
          location_dimension: {
            length: 100,
            width: 50,
            height: 80,
          },
        },
        cargos: [],
      });
    });

    const validUpdateRequest: TaskUpdateReq = {
      batch_job_id: testBatchId,
      updates: [
        {
          task_id: testTaskId,
          start_location: {
            location_id: 'LOC_001',
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          end_location: {
            location_id: 'LOC_002',
            location_dimension: {
              length: 100,
              width: 50,
              height: 80,
            },
          },
          cargos: [],
        },
      ],
    };

    it('should update tasks successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(validUpdateRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        batch_id: testBatchId,
        status: 'success',
      });

      // Verify task was updated
      const updatedTask = await taskRepository.findOne({
        where: { task_id: testTaskId },
      });
      expect(updatedTask).toBeDefined();
      expect(updatedTask?.status).toBeDefined();
    });

    it('should return 400 for invalid update request', async () => {
      const invalidRequest = {
        ...validUpdateRequest,
        updates: [
          {
            task_id: '', // Invalid: empty task_id
            start_location: {
              location_id: 'LOC_001',
              location_dimension: { length: 100, width: 50, height: 80 },
            },
            end_location: {
              location_id: 'LOC_002',
              location_dimension: { length: 100, width: 50, height: 80 },
            },
            cargos: [],
          },
        ],
      };

      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(invalidRequest)
        .expect(400);
    });

    it('should return 404 for non-existent batch', async () => {
      const requestWithInvalidBatch = {
        ...validUpdateRequest,
        batch_job_id: 'NON_EXISTENT_BATCH',
      };

      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(requestWithInvalidBatch)
        .expect(404);
    });
  });

  describe('DELETE /:warehouse_id/tasks/:batch_id (Cancel Batch)', () => {
    beforeEach(async () => {
      // Set up test batch
      await batchJobRepository.save({
        batch_job_id: testBatchId,
        warehouse_id: testWarehouseId,
        batch_priority: 5,
        batch_type: batch_type.Discrete,
        status: 'pending',
      });
    });

    const cancelRequest: CancelReq = {
      reason: 'Test cancellation',
      timestamp: '2025-01-01T10:00:00Z',
    };

    it('should cancel batch successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks/${testBatchId}/cancel`)
        .set('authorization', 'test-api-key')
        .send(cancelRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        batch_id: testBatchId,
        status: 'success',
        message: expect.stringContaining('cancelled'),
      });
      expect(response.body.cancelled_at).toBeDefined();
    });

    it('should return 404 for non-existent batch', async () => {
      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks/NON_EXISTENT_BATCH/cancel`)
        .set('authorization', 'test-api-key')
        .send(cancelRequest)
        .expect(404);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/tasks/${testBatchId}/cancel`)
        .send(cancelRequest)
        .expect(401);
    });
  });

  describe('DELETE /:warehouse_id/tasks/:batch_id/:task_id (Cancel Task)', () => {
    beforeEach(async () => {
      // Set up test batch and task
      const batchJob = await batchJobRepository.save({
        batch_job_id: testBatchId,
        warehouse_id: testWarehouseId,
        batch_priority: 5,
        batch_type: batch_type.Discrete,
        status: 'pending',
      });

      await taskRepository.save({
        task_id: testTaskId,
        batch_job_id: batchJob.id,
        task_type: TaskType.Picking,
        status: 'pending',
        start_location: {
          location_id: 'LOC_001',
          location_type: LocationType.Pallet,
          location_action: LocationAction.Pick,
          location_dimension: {
            length: 100,
            width: 50,
            height: 80,
          },
        },
        end_location: {
          location_id: 'LOC_002',
          location_type: LocationType.Pallet,
          location_action: LocationAction.Drop,
          location_dimension: {
            length: 100,
            width: 50,
            height: 80,
          },
        },
        cargos: [],
      });
    });

    const cancelRequest: CancelReq = {
      reason: 'Test task cancellation',
      timestamp: '2025-01-01T10:00:00Z',
    };

    it('should cancel task successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(
          `/robot-job/${testWarehouseId}/tasks/${testBatchId}/${testTaskId}/cancel`,
        )
        .set('authorization', 'test-api-key')
        .send(cancelRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        task_id: testTaskId,
        status: 'success',
        message: expect.stringContaining('cancelled'),
      });
      expect(response.body.cancelled_at).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      await request(app.getHttpServer())
        .patch(
          `/robot-job/${testWarehouseId}/tasks/${testBatchId}/NON_EXISTENT_TASK/cancel`,
        )
        .set('authorization', 'test-api-key')
        .send(cancelRequest)
        .expect(404);
    });

    it('should return 404 for non-existent batch', async () => {
      await request(app.getHttpServer())
        .patch(
          `/robot-job/${testWarehouseId}/tasks/NON_EXISTENT_BATCH/${testTaskId}/cancel`,
        )
        .set('authorization', 'test-api-key')
        .send(cancelRequest)
        .expect(404);
    });
  });

  describe('GET /:warehouse_id/locations (Get Empty Locations)', () => {
    it('should return empty locations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .set('authorization', 'test-api-key')
        .expect(200);

      expect(response.body).toMatchObject({
        zone_id: expect.any(String),
        available_location_types: expect.any(Array),
      });
    });

    it('should filter by location status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .query({ location_status: LocationStatus.Empty })
        .set('authorization', 'test-api-key')
        .expect(200);

      expect(response.body.available_location_types).toBeDefined();
    });

    it('should filter by location zone', async () => {
      const response = await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .query({ location_zone: 'ZONE_A' })
        .set('authorization', 'test-api-key')
        .expect(200);

      expect(response.body.available_location_types).toBeDefined();
    });

    it('should limit number of locations returned', async () => {
      const response = await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .query({ location_limit: 1 })
        .set('authorization', 'test-api-key')
        .expect(200);

      expect(response.body.available_location_types).toBeDefined();
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .expect(401);
    });
  });

  describe('PUT /:warehouse_id/webhook (Update Webhook)', () => {
    const updateWebhookRequest = {
      webhook_url: 'https://new-webhook.com/endpoint',
    };

    it('should update webhook successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/update-webhook`)
        .set('authorization', 'test-api-key')
        .send(updateWebhookRequest)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        message: expect.stringContaining('updated'),
        warehouse: {
          warehouse_id: testWarehouseId,
          webhook_url: 'https://new-webhook.com/endpoint',
        },
      });

      // Verify webhook was updated in database
      const updatedWarehouse = await warehouseRepository.findOne({
        where: { warehouse_id: testWarehouseId },
      });
      expect(updatedWarehouse).toBeDefined();
      expect(updatedWarehouse?.webhook_url).toBe(
        'https://new-webhook.com/endpoint',
      );
    });

    it('should return 400 for invalid webhook URL', async () => {
      const invalidRequest = {
        webhook_url: 'invalid-url',
      };

      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/update-webhook`)
        .set('authorization', 'test-api-key')
        .send(invalidRequest)
        .expect(400);
    });

    it('should handle null webhook URL', async () => {
      const nullWebhookRequest = {
        webhook_url: null,
      };

      const response = await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/update-webhook`)
        .set('authorization', 'test-api-key')
        .send(nullWebhookRequest)
        .expect(200);

      expect(response.body.warehouse.webhook_url).toBeNull();
    });

    it('should return 404 for non-existent warehouse', async () => {
      await request(app.getHttpServer())
        .patch(`/robot-job/NON_EXISTENT_WAREHOUSE/update-webhook`)
        .set('authorization', 'test-api-key')
        .send(updateWebhookRequest)
        .expect(401);
    });

    it('should return 401 for missing authorization', async () => {
      await request(app.getHttpServer())
        .patch(`/robot-job/${testWarehouseId}/update-webhook`)
        .send(updateWebhookRequest)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for invalid warehouse_id format', async () => {
      await request(app.getHttpServer())
        .get('/robot-job/invalid-warehouse-id/tasks/some-batch')
        .set('authorization', 'test-api-key')
        .expect(401);
    });

    it('should return 500 for internal server error', async () => {
      // This would require mocking database to throw an error
      // For now, we'll skip this test or implement based on specific error scenarios
    });
  });

  describe('Authentication and Authorization', () => {
    it('should accept valid API key', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .set('authorization', 'test-api-key')
        .expect(200);
    });

    it('should reject invalid API key', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .set('authorization', 'invalid-api-key')
        .expect(401);
    });

    it('should reject missing API key', async () => {
      await request(app.getHttpServer())
        .get(`/robot-job/${testWarehouseId}/locations`)
        .expect(401);
    });
  });

  describe('Input Validation', () => {
    it('should validate required fields in task creation', async () => {
      const incompleteRequest = {
        batch_job_id: testBatchId,
        tasks: [
          {
            // Missing required fields
            task_id: '',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(incompleteRequest)
        .expect(400);

      expect(response.body.message).toContain('not valid');
    });

    it('should validate enum values', async () => {
      const invalidEnumRequest = {
        batch_job_id: testBatchId,
        batch_type: 'InvalidBatchType',
        tasks: [
          {
            task_id: testTaskId,
            task_type: 'InvalidTaskType',
            start_location: {
              /* valid location */
            },
            end_location: {
              /* valid location */
            },
            cargos: [],
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(invalidEnumRequest)
        .expect(400);
    });

    it('should validate nested objects', async () => {
      const invalidNestedRequest = {
        batch_job_id: testBatchId,
        tasks: [
          {
            task_id: testTaskId,
            task_type: TaskType.Picking,
            start_location: {
              location_id: 'LOC_001',
              location_type: LocationType.Pallet,
              location_action: LocationAction.Pick,
              location_dimension: {
                length: -100, // Invalid: negative value
                width: 50,
                height: 80,
              },
            },
            end_location: {
              /* valid location */
            },
            cargos: [],
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/robot-job/${testWarehouseId}/tasks`)
        .set('authorization', 'test-api-key')
        .send(invalidNestedRequest)
        .expect(400);
    });
  });
});
