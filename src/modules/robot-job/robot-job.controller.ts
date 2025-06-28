import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  BadRequestException,
  Logger,
  Req,
} from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { Validator } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Request } from 'express';
import {
  LocationAction,
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { BatchCancelRes, CancelReq, TaskCancelRes } from './dto/Cancel.dto';
import {
  GetLocationReq,
  GetLocationRes,
  LocationStatus,
  LocationType,
} from './dto/GetLocation.dto';

import { NotFoundDto } from './dto/NotFound.dto';
import { BadRequestDto } from './dto/BadRequest.dto';
import { UnauthorizedDto } from './dto/Unauthorized.dto';
import { ForbiddenDto } from './dto/Forbidden.dto';
import { InternalServerErrorDto } from './dto/InternalServerError.dto';
import { ConflictDto } from './dto/Conflict.dto';
import { config } from 'process';
import { GetTasksParamsDto, GetTasksResponseDto } from './dto/GetTasks.dto';
import { UpdateWebhookReq, UpdateWebhookRes } from './dto/UpdateWebhook.dto';
import {
  UpdateLocationTrackingReq,
  UpdateLocationTrackingRes,
} from './dto/UpdateLocationTracking.dto';
import {
  ApiTags,
  ApiHeader,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

@ApiSecurity('api-key')
@Controller('robot-job')
export class RobotJobController {
  private readonly logger = new Logger(RobotJobController.name);
  private readonly validator = new Validator();

  constructor(private readonly robotJobService: RobotJobService) {}

  @ApiOperation({ summary: 'Get tasks for a specific warehouse and batch' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Warehouse identifier',
    example: 'WH_001',
  })
  @ApiParam({
    name: 'batch_id',
    type: String,
    description: 'Batch identifier',
    example: 'BATCH_123',
  })
  @ApiResponse({
    status: 200,
    description:
      'Successfully retrieved list of tasks for the given batch and warehouse',
    type: GetTasksResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input parameters provided',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Batch job not found in the specified warehouse',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  @Get(':warehouse_id/tasks/:batch_id')
  async getTasks(
    @Param() params: GetTasksParamsDto,
  ): Promise<GetTasksResponseDto> {
    const taskEntities = await this.robotJobService.getTasksByBatchId(
      params.warehouse_id,
      params.batch_id,
    );

    const tasksForResponse = taskEntities.map((entity) => {
      return {
        ...entity,
        wait: entity.wait_time,
      };
    });

    return { tasks: tasksForResponse };
  }

  @ApiOperation({ summary: 'Create a batch task' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique warehouse identifier where the task will be created',
    example: 'WH_001',
  })

  @ApiBody({
    type: TaskGenerationReq,
    description: 'Task request body',
  })
  @ApiResponse({
    status: 201,
    description: 'Task batch created successfully.',
    type: TaskGenerationRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid task request body',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request due to missing/invalid API key',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Task conflict, e.g., duplicate batch or task in progress',
    type: ConflictDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected server error while creating task',
    type: InternalServerErrorDto,
  })
  @Post(':warehouse_id/tasks')
  async unifiedCreateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Req() request: Request,
  ): Promise<TaskGenerationRes> {
    const config = request.taskConfigs?.create_task;
    const structuredDto = plainToInstance(TaskGenerationReq, body);
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length === 0) {
      return this.robotJobService.createTask(warehouseId, structuredDto);
    }

    if (config) {
      return this.robotJobService.createUnstructuredTask(
        warehouseId,
        config,
        body,
      );
    }

    throw new BadRequestException('Request body is not valid.');
  }

  @ApiOperation({ summary: 'Update a batch task' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique warehouse identifier where the task exists',
    example: 'WH_001',
  })

  @ApiBody({
    type: TaskUpdateReq,
    description: 'Task update body',
  })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully',
    type: TaskUpdateRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid task update body',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request due to missing/invalid API key',
    type: UnauthorizedDto,
  })

  @ApiResponse({
    status: 404,
    description: 'Batch or task not found in the specified warehouse',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Task cannot be updated',
    type: ConflictDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error during update',
    type: InternalServerErrorDto,
  })
  @Patch(':warehouse_id/tasks')
  async unifiedUpdateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Req() request: Request,
  ): Promise<TaskUpdateRes> {
    const config = request.taskConfigs?.update_task;
    const structuredDto = plainToInstance(TaskUpdateReq, body);
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length === 0) {
      const result = await this.robotJobService.updateTask(
        warehouseId,
        structuredDto,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    if (config) {
      const result = await this.robotJobService.updateUnstructuredTask(
        warehouseId,
        config,
        body,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    throw new BadRequestException(
      'Request body is not a valid update structure.',
    );
  }

  @ApiOperation({ summary: 'Cancel a batch task' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique warehouse identifier where the batch was created',
    example: 'WH_001',
  })
  @ApiParam({
    name: 'batch_id',
    type: String,
    description: 'Unique batch identifier to cancel',
    example: 'BATCH_456',
  })

  @ApiBody({
    type: CancelReq,
    description: 'Cancellation request body',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch cancellation completed successfully',
    type: BatchCancelRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid cancel request body',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — invalid or missing API key',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Batch not found in the specified warehouse',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Unable to cancel the batch',
    type: ConflictDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error during batch cancellation',
    type: InternalServerErrorDto,
  })
  @Patch(':warehouse_id/tasks/:batch_id/cancel')
  async cancelBatch(
    @Param('warehouse_id') warehouseId: string,
    @Param('batch_id') batchId: string,
    @Body() body: CancelReq,
    @Req() request: Request,
  ): Promise<BatchCancelRes> {
    const config = request.taskConfigs?.cancel_task;
    if (config) {
      const result = await this.robotJobService.cancelUnstructuredBatch(
        warehouseId,
        batchId,
        config,
        body,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    const batchDto = plainToInstance(CancelReq, body);
    const validationErrors = await this.validator.validate(batchDto);

    if (validationErrors.length === 0) {
      const result = await this.robotJobService.cancelBatch(
        warehouseId,
        batchId,
        batchDto,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    throw new BadRequestException('Invalid request body found.');
  }

  @ApiOperation({ summary: 'Cancel a task' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique warehouse identifier',
    example: 'WH_001',
  })
  @ApiParam({
    name: 'batch_id',
    type: String,
    description: 'Unique batch identifier the task belongs to',
    example: 'BATCH_456',
  })
  @ApiParam({
    name: 'task_id',
    type: String,
    description: 'Unique task identifier to be cancelled',
    example: 'TASK_789',
  })

  @ApiBody({
    type: CancelReq,
    description: 'Task cancellation request body',
  })
  @ApiResponse({
    status: 200,
    description: 'Task successfully cancelled',
    type: TaskCancelRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized request due to invalid or missing API key',
    type: UnauthorizedDto,
  })
  
  @ApiResponse({
    status: 404,
    description: 'Batch or task not found in the given warehouse',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Unable to cancel a task',
    type: ConflictDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected server error during task cancellation',
    type: InternalServerErrorDto,
  })
  @Patch(':warehouse_id/tasks/:batch_id/:task_id/cancel')
  async cancelTask(
    @Param('warehouse_id') warehouseId: string,
    @Param('batch_id') batchId: string,
    @Param('task_id') taskId: string,
    @Body() body: CancelReq,
    @Req() request: Request,
  ): Promise<TaskCancelRes> {
    const config = request.taskConfigs?.cancel_task;
    if (config) {
      const result = await this.robotJobService.cancelUnstructuredTask(
        warehouseId,
        batchId,
        taskId,
        config,
        body,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    const singleTaskDto = plainToInstance(CancelReq, body);
    const validationErrors = await this.validator.validate(singleTaskDto);

    if (validationErrors.length === 0) {
      const result = await this.robotJobService.cancelTask(
        warehouseId,
        batchId,
        taskId,
        singleTaskDto,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    throw new BadRequestException('Invalid Request Body Found.');
  }

  @ApiOperation({ summary: 'Get available empty locations in a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique identifier of the warehouse',
    example: 'WH_001',
  })

  @ApiQuery({
    name: 'location_status',
    required: false,
    type: String,
    description: 'Filter locations by status (e.g. Empty, Occupied)',
    example: 'Empty',
  })
  @ApiQuery({
    name: 'location_zone',
    required: false,
    type: String,
    description: 'Filter locations by zone ID',
    example: 'ZONE_A1',
  })
  @ApiQuery({
    name: 'location_type',
    required: false,
    type: String,
    description: 'Filter locations by type (e.g. Zone, Aisle, Bay, Palette)',
    example: 'Zone',
  })
  @ApiQuery({
    name: 'location_level',
    required: false,
    type: String,
    description:
      'Filter locations by level (e.g. Ground, First, Second, Third)',
    example: 'All',
  })
  @ApiQuery({
    name: 'location_limit',
    required: false,
    type: Number,
    description: 'Limit the number of locations returned',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'List of available locations returned successfully',
    type: GetLocationRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid body structure',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
    type: UnauthorizedDto,
  })

  @ApiResponse({
    status: 404,
    description: 'Warehouse not found or invalid reference in filters',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while processing location fetch',
    type: InternalServerErrorDto,
  })
  @Get(':warehouse_id/locations')
  async getEmptyLocations(
    @Param('warehouse_id') warehouseId: string,
    @Req() request: Request,
    @Query('location_status') locationStatus?: LocationStatus,
    @Query('location_zone') locationZone?: string,
    @Query('location_type') locationType?: LocationType,
    @Query('location_level') locationLevel?: string,
    @Query('location_limit') locationLimit?: number,
  ): Promise<GetLocationRes> {
    const config = request.taskConfigs?.get_location;
    if (config) {
      const getLocationReq: GetLocationReq = {
        location_status: locationStatus as LocationStatus.All,
        location_zone: locationZone || '',
        location_type: locationType as LocationType.Pallet,
        location_level: locationLevel || 'All',
        location_limit: locationLimit || 0,
      };
      return await this.robotJobService.getLocations(
        warehouseId,
        getLocationReq,
        config,
      );
    } else {
      const dummy: GetLocationRes = {
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

      return dummy;
    }
  }

  @ApiOperation({ summary: 'Update webhook URL for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique identifier of the warehouse',
    example: 'WH_001',
  })
  @ApiBody({
    type: UpdateWebhookReq,
    description: 'Webhook update request body',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook URL updated successfully',
    type: UpdateWebhookRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body or webhook URL format',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error while updating webhook',
    type: InternalServerErrorDto,
  })
  @Patch(':warehouse_id/update-webhook')
  async updateWebhook(
    @Param('warehouse_id') warehouseId: string,
    @Body() updateWebhookDto: UpdateWebhookReq,
  ): Promise<UpdateWebhookRes> {
    const structuredDto = plainToInstance(UpdateWebhookReq, updateWebhookDto);
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length > 0) {
      throw new BadRequestException('Invalid webhook URL format');
    }

    return await this.robotJobService.updateWebhook(warehouseId, structuredDto);
  }

  @ApiOperation({
    summary: 'Update location tracking settings for a warehouse',
  })
  @ApiParam({
    name: 'warehouse_id',
    type: String,
    description: 'Unique identifier of the warehouse',
    example: 'WH_001',
  })
  @ApiBody({
    type: UpdateLocationTrackingReq,
    description: 'Location tracking update request body',
  })
  @ApiResponse({
    status: 200,
    description: 'Location tracking settings updated successfully',
    type: UpdateLocationTrackingRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing API key',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error while updating location tracking settings',
    type: InternalServerErrorDto,
  })
  @Patch(':warehouse_id/update-location-tracking')
  async updateLocationTracking(
    @Param('warehouse_id') warehouseId: string,
    @Body() updateLocationTrackingDto: UpdateLocationTrackingReq,
  ): Promise<UpdateLocationTrackingRes> {
    const structuredDto = plainToInstance(
      UpdateLocationTrackingReq,
      updateLocationTrackingDto,
    );
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length > 0) {
      throw new BadRequestException('Invalid location tracking settings');
    }

    return await this.robotJobService.updateLocationTracking(
      warehouseId,
      structuredDto,
    );
  }
}
