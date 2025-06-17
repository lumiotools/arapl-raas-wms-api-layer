import { Test, TestingModule } from '@nestjs/testing';
import { RobotJobController } from './robot-job.controller';
import { RobotJobService } from './robot-job.service';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  TaskGenerationReq,
  TaskGenerationRes,
  TaskType,
  LocationAction,
  batch_type,
} from './dto/Task_Generation.dto';

const mockValidStructuredBody: TaskGenerationReq = {
  batch_job_id: 'job12345',
  batch_priority: 5,
  batch_type: batch_type.Discrete,
  batch_frequency: 1,
  warehouse_id: '123',
  tasks: [
    {
      task_id: 'task001',
      task_pallet_id: 'pallet001',
      task_type: TaskType.CrossDocking,
      task_dependency: 'abc',
      start_location: {
        location_id: 'ST1-4-1-1',
        location_zone: 'zoneA',
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
        location_zone: 'zoneB',
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
      wait_time: {
        wait_type: 'WaitDrop',
        start_location_wait_time: 10,
        end_location_wait_time: 5,
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

const mockUnstructuredBody = {
  jobId: 'BATCH-20240413-001',
  priority: 3,
  type: 'Discrete',
  operations: [
    {
      id: 'TASK-001',
      kind: 'Crossdock',
      start: { id: 'LOC-START-01', action: 'Pick' },
      end: { id: 'LOC-END-01', action: 'Drop' },
      items: [{ code: 'CARGO-001', type: 'Pallet' }],
    },
  ],
};

const mockWarehouseId = '123';

describe('RobotJobController', () => {
  let controller: RobotJobController;
  let service: RobotJobService;

  const mockRobotJobService = {
    createTask: jest.fn(),
    createUnstructuredTask: jest.fn(),

    updateTask: jest.fn(),
    updateUnstructuredTask: jest.fn(),
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
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create_task', () => {
    // SCENARIO 1: Simple Happy Path (Structured Data)
    it('Create_task: should create a task successfully with a valid structured body', async () => {
      // Arrange: Mock the service to return a successful response.
      const successResponse: TaskGenerationRes = {
        batch_job_id: 'BATCH-STRUCTURED-001',
        status: 'success',
      };
      mockRobotJobService.createTask.mockResolvedValue(successResponse);

      // Act: Call the controller method with valid structured data.
      const result = await controller.unifiedCreateTask(
        mockWarehouseId,
        mockValidStructuredBody,
      );

      expect(service.createTask).toHaveBeenCalledWith(
        mockWarehouseId,
        expect.objectContaining(mockValidStructuredBody),
      );
      expect(service.createUnstructuredTask).not.toHaveBeenCalled();
      expect(result).toEqual(successResponse);
    });

    // SCENARIO 2: Happy Path (Unstructured Data with Config)
    it('create_task: should create a task successfully with an unstructured body and config_name', async () => {
      // Arrange
      const configName = 'cli';
      const successResponse: TaskGenerationRes = {
        batch_job_id: 'BATCH-20240413-001',
        status: 'success',
      };
      mockRobotJobService.createUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      // Act: Call the controller with unstructured data and a config name.
      const result = await controller.unifiedCreateTask(
        mockWarehouseId,
        mockUnstructuredBody,
        configName,
      );

      // Assert: Verify the unstructured task creation path was taken.
      expect(service.createUnstructuredTask).toHaveBeenCalledWith(
        mockWarehouseId,
        configName,
        'create_task',
        mockUnstructuredBody,
      );
      expect(service.createTask).not.toHaveBeenCalled();
      expect(result).toEqual(successResponse);
    });

    // SCENARIO 3: Invalid Body without a Config
    it('create_task: should throw BadRequestException for an invalid body without a config_name', async () => {
      // Arrange: An invalid body that will fail DTO validation.
      const invalidBody = { some: 'invalid-data' };

      // Act & Assert: Expect the method to reject with a specific exception.
      await expect(
        controller.unifiedCreateTask(mockWarehouseId, invalidBody),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.unifiedCreateTask(mockWarehouseId, invalidBody),
      ).rejects.toThrow(
        'Request body is not a valid task structure and no `config_name` was provided for transformation.',
      );

      // Verify that no service methods were called.
      expect(service.createTask).not.toHaveBeenCalled();
      expect(service.createUnstructuredTask).not.toHaveBeenCalled();
    });

    // SCENARIO 4: Transformation Fails in the Service
    it('create_task: should throw BadRequestException if unstructured transformation fails', async () => {
      // Arrange: Mock the service to return an error status from the transformation.
      const configName = 'failing_config';
      const errorResponse = {
        status: 'error',
        message: 'Transformation failed due to missing fields',
      };
      mockRobotJobService.createUnstructuredTask.mockResolvedValue(
        errorResponse,
      );

      // Act & Assert: Expect the controller to throw a BadRequestException with the service's error message.
      await expect(
        controller.unifiedCreateTask(
          mockWarehouseId,
          mockUnstructuredBody,
          configName,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // SCENARIO 5: Complex/Mixed Unstructured Input
    it('create_task: should correctly pass complex or mixed-type unstructured body to the service', async () => {
      // Arrange: A body with an object where an array might be expected by some mappings.
      const complexBody = {
        jobId: 'BATCH-COMPLEX-001',
        operations: { id: 'TASK-001' }, // object instead of array
        metadata: { timestamp: new Date() },
      };
      const configName = 'cli';
      const successResponse: TaskGenerationRes = {
        batch_job_id: 'BATCH-COMPLEX-001',
        status: 'success',
      };
      mockRobotJobService.createUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      // Act
      const result = await controller.unifiedCreateTask(
        mockWarehouseId,
        complexBody,
        configName,
      );

      // Assert: The controller should not break; it should pass the body to the service,
      // which is responsible for handling the transformation.
      expect(service.createUnstructuredTask).toHaveBeenCalledWith(
        mockWarehouseId,
        configName,
        'create_task',
        complexBody,
      );
      expect(result).toEqual(successResponse);
    });
  });

  describe('update_task', () => {
    it('update_task: should update a task successfully with a valid structured body', async () => {
      // Arrange: Mock the service to return a successful response.
      const successResponse = {
        task_id: 'task001',
        status: 'success',
        updated_at: new Date().toISOString(),
      };
      const mockUpdateBody = {
        batch_job_id: 'job12345',
        updates: [
          {
            task_id: 'task001',
            start_location: { location_id: 'ST1-4-1-1' },
            end_location: { location_id: 'DZ1-6-1-6' },
            cargos:[]
          },
        ],
      };
      mockRobotJobService.updateTask.mockResolvedValue(successResponse);

      // Act: Call the controller method with valid structured data.
      const result = await controller.unifiedUpdateTask(
        mockWarehouseId,
        mockUpdateBody,
      );

      expect(service.updateTask).toHaveBeenCalledWith(
        mockWarehouseId,
        expect.objectContaining(mockUpdateBody),
      );
      expect(result).toEqual(successResponse);
    });

    it('update_task: should update a task successfully with an unstructured body and config_name', async () => {
      // Arrange
      const configName = 'cli';
      const successResponse = {
        task_id: 'task001',
        status: 'success',
        updated_at: new Date().toISOString(),
      };
      const mockUnstructuredUpdateBody = {
        jobId: 'BATCH-20240413-001',
        updates: [
          {
            id: 'TASK-001',
            start: { id: 'LOC-START-01' },
            end: { id: 'LOC-END-01' },
          },
        ],
      };
      mockRobotJobService.updateUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      // Act: Call the controller with unstructured data and a config name.
      const result = await controller.unifiedUpdateTask(
        mockWarehouseId,
        mockUnstructuredUpdateBody,
        configName,
      );

      // Assert: Verify the unstructured task update path was taken.
      expect(service.updateUnstructuredTask).toHaveBeenCalledWith(
        mockWarehouseId,
        configName,
        'update_task',
        mockUnstructuredUpdateBody,
      );
      expect(service.updateTask).not.toHaveBeenCalled();
      expect(result).toEqual(successResponse);
    });

    it ('update_task: should throw BadRequestException for an invalid body without a config_name', async () => {
      // Arrange: An invalid body that will fail DTO validation.
      const invalidBody = { some: 'invalid-data' };

      // Act & Assert: Expect the method to reject with a specific exception.
      await expect(
        controller.unifiedUpdateTask(mockWarehouseId, invalidBody),
      ).rejects.toThrow(BadRequestException);

      await expect(
        controller.unifiedUpdateTask(mockWarehouseId, invalidBody),
      ).rejects.toThrow(
        'Request body is not a valid update structure and no `config_name` was provided for transformation.',
      );

      // Verify that no service methods were called.
      expect(service.updateTask).not.toHaveBeenCalled();
      expect(service.updateUnstructuredTask).not.toHaveBeenCalled();
    });

    it ('update_task: should throw BadRequestException if unstructured transformation fails', async () => {
      // Arrange: Mock the service to return an error status from the transformation.
      const configName = 'failing_config';
      const errorResponse = {
        status: 'error',
        message: 'Transformation failed due to missing fields',
      };
      mockRobotJobService.updateUnstructuredTask.mockResolvedValue(
        errorResponse,
      );

      // Act & Assert: Expect the controller to throw a BadRequestException with the service's error message.
      await expect(
        controller.unifiedUpdateTask(
          mockWarehouseId,
          mockUnstructuredBody,
          configName,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it ('update_task: should correctly pass complex or mixed-type unstructured body to the service', async () => {
      // Arrange: A body with an object where an array might be expected by some mappings.
      const complexBody = {
        jobId: 'BATCH-COMPLEX-001',
        updates: { id: 'TASK-001' }, // object instead of array
        metadata: { timestamp: new Date() },
      };
      const configName = 'cli';
      const successResponse = {
        task_id: 'task001',
        status: 'success',
        updated_at: new Date().toISOString(),
      };
      mockRobotJobService.updateUnstructuredTask.mockResolvedValue(
        successResponse,
      );

      // Act
      const result = await controller.unifiedUpdateTask(
        mockWarehouseId,
        complexBody,
        configName,
      );

      // Assert: The controller should not break; it should pass the body to the service,
      // which is responsible for handling the transformation.
      expect(service.updateUnstructuredTask).toHaveBeenCalledWith(
        mockWarehouseId,
        configName,
        'update_task',
        complexBody,
      );
      expect(result).toEqual(successResponse);
    });
  });
});
