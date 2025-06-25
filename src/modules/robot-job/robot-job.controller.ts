import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { Validator } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { BatchCancelRes, CancelReq, TaskCancelRes } from './dto/Cancel.dto';
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';

import { NotFoundDto } from './dto/NotFound.dto';
import { BadRequestDto } from './dto/BadRequest.dto';
import { UnauthorizedDto } from './dto/Unauthorized.dto';
import { ForbiddenDto } from './dto/Forbidden.dto';
import { InternalServerErrorDto } from './dto/InternalServerError.dto';
import { ConflictDto } from './dto/Conflict.dto';
import { config } from 'process';
import { GetTasksParamsDto, GetTasksResponseDto } from './dto/GetTasks.dto';
import { ApiTags,ApiHeader, ApiSecurity ,ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';


@ApiSecurity('api-key')
 @ApiHeader({
  name: 'version',
  description: 'API version header',
  required:true,
  example:'2.1.3'
}) 
@Controller('robot-job')
export class RobotJobController {
  private readonly logger = new Logger(RobotJobController.name);
  private readonly validator = new Validator();

  constructor(private readonly robotJobService: RobotJobService) {}

  // @Get(':warehouse_id/tasks/:batch_id')
  // async getTasks(
  //   @Param() params: GetTasksParamsDto,
  // ): Promise<GetTasksResponseDto> {
  //   const taskEntities = await this.robotJobService.getTasksByBatchId(
  //     params.warehouse_id,
  //     params.batch_id,
  //   );

  //   const tasksForResponse = taskEntities.map((entity) => {
  //     return {
  //       ...entity,
  //       wait: entity.wait_time,
  //     };
  //   });

  //   return { tasks: tasksForResponse };
  // }
  
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
  description: 'Successfully retrieved list of tasks for the given batch and warehouse',
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



  // @Post(':warehouse_id/tasks')
  // async unifiedCreateTask(
  //   @Param('warehouse_id') warehouseId: string,
  //   @Body() body: any,
  //   @Query('config_name') configName?: string,
  // ): Promise<TaskGenerationRes> {
  //   const structuredDto = plainToInstance(TaskGenerationReq, body);
  //   const validationErrors = await this.validator.validate(structuredDto);

  //   if (validationErrors.length === 0) {
  //     const result = await this.robotJobService.createTask(
  //       warehouseId,
  //       structuredDto,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.status);
  //     }
  //     return result;
  //   }

  //   if (configName) {
  //     const result = await this.robotJobService.createUnstructuredTask(
  //       warehouseId,
  //       configName,
  //       'create_task', // Specify the operation type
  //       body,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.status);
  //     }
  //     return result;
  //   }

  //   throw new BadRequestException(
  //     'Request body is not a valid task structure and no `config_name` was provided for transformation.',
  //   );
  // }


@ApiOperation({ summary: 'Create a structured or unstructured task' })

@ApiParam({
  name: 'warehouse_id',
  type: String,
  description: 'Unique warehouse identifier where the task will be created',
  example: 'WH_001',
})


@ApiBody({
  type: TaskGenerationReq,
  description: 'Structured task request body (used when config_name is not provided)',
})

@ApiResponse({
  status: 201,
  description: 'Task batch created successfully.',
  type: TaskGenerationRes,
})

@ApiResponse({
  status: 400,
  description: 'Invalid structured task or missing request body for unstructured task',
  type: BadRequestDto,
})

@ApiResponse({
  status: 401,
  description: 'Unauthorized request due to missing/invalid credentials',
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
  // @Query('config_name') configName?: string,
): Promise<TaskGenerationRes> {
  const structuredDto = plainToInstance(TaskGenerationReq, body);
  const validationErrors = await this.validator.validate(structuredDto);

  if (validationErrors.length === 0) {
    return this.robotJobService.createTask(warehouseId, structuredDto);
  }

  // if (configName) {
  //   return this.robotJobService.createUnstructuredTask(
  //     warehouseId,
  //     configName,
  //     'create_task',
  //     body,
  //   );
  // }

  throw new BadRequestException(
    'Request body is not a valid .',
  );
}

  // @Patch(':warehouse_id/tasks')
  // async unifiedUpdateTask(
  //   @Param('warehouse_id') warehouseId: string,
  //   @Body() body: any,
  //   @Query('config_name') configName?: string,
  // ): Promise<TaskUpdateRes> {
  //   const structuredDto = plainToInstance(TaskUpdateReq, body);
  //   const validationErrors = await this.validator.validate(structuredDto);

  //   if (validationErrors.length === 0) {
  //     const result = await this.robotJobService.updateTask(
  //       warehouseId,
  //       structuredDto,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }

  //   if (configName) {
  //     const result = await this.robotJobService.updateUnstructuredTask(
  //       warehouseId,
  //       configName,
  //       'update_task', // Specify the operation type
  //       body,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }

  //   throw new BadRequestException(
  //     'Request body is not a valid update structure and no `config_name` was provided for transformation.',
  //   );
  // }

@ApiOperation({ summary: 'Update a structured or unstructured task' })

@ApiParam({
  name: 'warehouse_id',
  type: String,
  description: 'Unique warehouse identifier where the task exists',
  example: 'WH_001',
})

@ApiQuery({
  name: 'config_name',
  required: false,
  type: String,
  description: 'Optional config name used for unstructured task update',
  example: 'robot_sorting_config',
})

@ApiBody({
  type: TaskUpdateReq,
  description: 'Structured task update body (used when config_name is not provided)',
})

@ApiResponse({
  status: 200,
  description: 'Task updated successfully',
  type: TaskUpdateRes,
})

@ApiResponse({
  status: 400,
  description: 'Invalid task update body or missing transformation config',
  type: BadRequestDto,
})

@ApiResponse({
  status: 401,
  description: 'Unauthorized request due to missing/invalid credentials',
  type: UnauthorizedDto,
})

@ApiResponse({
  status: 403,
  description: 'User does not have permission to update tasks in this warehouse',
  type: ForbiddenDto,
})

@ApiResponse({
  status: 404,
  description: 'Batch or task not found in the specified warehouse',
  type: NotFoundDto,
})

@ApiResponse({
  status: 409,
  description: 'Conflict — task is in a non-updatable state',
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
  @Query('config_name') configName?: string,
): Promise<TaskUpdateRes> {
  const structuredDto = plainToInstance(TaskUpdateReq, body);
  const validationErrors = await this.validator.validate(structuredDto);

  if (validationErrors.length === 0) {
    const result = await this.robotJobService.updateTask(warehouseId, structuredDto);
    if (result.status !== 'success') {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  if (configName) {
    const result = await this.robotJobService.updateUnstructuredTask(
      warehouseId,
      configName,
      'update_task',
      body,
    );
    if (result.status !== 'success') {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  throw new BadRequestException(
    'Request body is not a valid update structure and no `config_name` was provided for transformation.',
  );
}




  // @Patch(':warehouse_id/tasks/:batch_id/cancel')
  // async cancelBatch(
  //   @Param('warehouse_id') warehouseId: string,
  //   @Param('batch_id') batchId: string,
  //   @Body() body: CancelReq,
  //   @Query('config_name') configName?: string
  // ): Promise<BatchCancelRes> {
  //   if (configName) {
  //     const result = await this.robotJobService.cancelUnstructuredBatch(
  //       warehouseId,
  //       batchId,
  //       configName,
  //       'cancel_task', // Specify the operation type
  //       body,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }
  //   const batchDto = plainToInstance(CancelReq, body);
  //   const validationErrors = await this.validator.validate(batchDto);
  //   console.log('structuredDto: ', batchDto);
  //   if (validationErrors.length === 0) {
  //     const result = await this.robotJobService.cancelBatch(
  //       warehouseId,
  //       batchId,
  //       batchDto,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }

  //   throw new BadRequestException(
  //     'Request body is not a valid cancellation structure and no `config_name` was provided for transformation.',
  //   );
  // }

@ApiOperation({ summary: 'Cancel a batch of tasks (structured or unstructured)' })

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

@ApiQuery({
  name: 'config_name',
  required: false,
  type: String,
  description: 'Optional config name for unstructured batch cancellation',
  example: 'cancel_config_v1',
})

@ApiBody({
  type: CancelReq,
  description: 'Structured cancellation request body (used when config_name is not provided)',
})

@ApiResponse({
  status: 200,
  description: 'Batch cancellation completed successfully',
  type: BatchCancelRes,
})

@ApiResponse({
  status: 400,
  description: 'Invalid cancel request body or transformation error',
  type: BadRequestDto,
})

@ApiResponse({
  status: 401,
  description: 'Unauthorized — invalid or missing token',
  type: UnauthorizedDto,
})

@ApiResponse({
  status: 403,
  description: 'Forbidden — user not allowed to cancel this batch',
  type: ForbiddenDto,
})

@ApiResponse({
  status: 404,
  description: 'Batch not found in the specified warehouse',
  type: NotFoundDto,
})

@ApiResponse({
  status: 409,
  description: 'Batch is not in a cancellable state',
  type: ConflictDto,
})

@ApiResponse({
  status: 500,
  description: 'Unexpected internal server error during cancellation',
  type: InternalServerErrorDto,
})

@Patch(':warehouse_id/tasks/:batch_id/cancel')
async cancelBatch(
  @Param('warehouse_id') warehouseId: string,
  @Param('batch_id') batchId: string,
  @Body() body: CancelReq,
  @Query('config_name') configName?: string,
): Promise<BatchCancelRes> {
  if (configName) {
    const result = await this.robotJobService.cancelUnstructuredBatch(
      warehouseId,
      batchId,
      configName,
      'cancel_task',
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

  throw new BadRequestException(
    'Request body is not a valid cancellation structure and no `config_name` was provided for transformation.',
  );
}




  // @Patch(':warehouse_id/tasks/:batch_id/:task_id/cancel')
  // async cancelTask(
  //   @Param('warehouse_id') warehouseId: string,
  //   @Param('batch_id') batchId: string,
  //   @Param('task_id') taskId: string,
  //   @Body() body: CancelReq,
  //   @Query('config_name') configName?: string
  // ): Promise<TaskCancelRes> {
  //   if (configName) {
  //     const result = await this.robotJobService.cancelUnstructuredTask(
  //       warehouseId,
  //       batchId,
  //       taskId,
  //       configName,
  //       'cancel_task', // Specify the operation type
  //       body,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }
  //   const singleTaskDto = plainToInstance(CancelReq, body);
  //   const validationErrors = await this.validator.validate(singleTaskDto);

  //   if (validationErrors.length === 0) {
  //     const result = await this.robotJobService.cancelTask(
  //       warehouseId,
  //       batchId,
  //       taskId,
  //       singleTaskDto,
  //     );
  //     if (result.status !== 'success') {
  //       throw new BadRequestException(result.message);
  //     }
  //     return result;
  //   }
  //   throw new BadRequestException(
  //     'Request body is not a valid cancellation structure and no `config_name` was provided for transformation.',
  //   );
  // }

@ApiOperation({ summary: 'Cancel a specific task (structured or unstructured)' })

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

@ApiQuery({
  name: 'config_name',
  required: false,
  type: String,
  description: 'Optional config name used for unstructured task cancellation',
  example: 'cancel_config_v1',
})

@ApiBody({
  type: CancelReq,
  description: 'Structured task cancellation request body (used if config_name is not provided)',
})

@ApiResponse({
  status: 200,
  description: 'Task successfully cancelled',
  type: TaskCancelRes,
})
@ApiResponse({
  status: 400,
  description: 'Invalid request body or missing transformation config',
  type: BadRequestDto,
})
@ApiResponse({
  status: 401,
  description: 'Unauthorized request due to invalid or missing credentials',
  type: UnauthorizedDto,
})
@ApiResponse({
  status: 403,
  description: 'Forbidden — user lacks permission to cancel this task',
  type: ForbiddenDto,
})
@ApiResponse({
  status: 404,
  description: 'Batch or task not found in the given warehouse',
  type: NotFoundDto,
})
@ApiResponse({
  status: 409,
  description: 'Conflict — task is not in a cancellable state',
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
  @Query('config_name') configName?: string,
): Promise<TaskCancelRes> {
  if (configName) {
    const result = await this.robotJobService.cancelUnstructuredTask(
      warehouseId,
      batchId,
      taskId,
      configName,
      'cancel_task',
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

  throw new BadRequestException(
    'Request body is not a valid cancellation structure and no `config_name` was provided for transformation.',
  );
}



//   @Get(':warehouse_id/locations')
//   async getEmptyLocations(
//     @Param('warehouse_id') warehouseId: string,
//     @Body() getLocationReq: GetLocationReq,
//     @Query('config_name') configName: string,
//   ): Promise<GetLocationRes> {
//     if (configName) {
//       return await this.robotJobService.getLocations(
//         warehouseId,
//         getLocationReq,
//         configName,
//       );
//     } else {
//       // Handle the case when configName is provided, or throw an error if not supported
//       throw new BadRequestException(
//         '`config_name` parameter is not supported for this endpoint.'
//       );
//     }
//   }

// }
@ApiOperation({ summary: 'Get available empty locations in a warehouse' })

@ApiParam({
  name: 'warehouse_id',
  type: String,
  description: 'Unique identifier of the warehouse',
  example: 'WH_001',
})

@ApiQuery({
  name: 'config_name',
  required: true,
  type: String,
  description: 'Configuration name used to filter locations',
  example: 'putaway_config_v1',
})

@ApiBody({
  type: GetLocationReq,
  description: 'Request body with optional filters for retrieving available locations',
})

@ApiResponse({
  status: 200,
  description: 'List of available locations returned successfully',
  type: GetLocationRes,
})

@ApiResponse({
  status: 400,
  description: 'Bad request — config_name missing or invalid body structure',
  type: BadRequestDto,
})

@ApiResponse({
  status: 401,
  description: 'Unauthorized — invalid or missing token',
  type: UnauthorizedDto,
})

@ApiResponse({
  status: 403,
  description: 'Forbidden — user does not have access to this warehouse',
  type: ForbiddenDto,
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
  @Body() getLocationReq: GetLocationReq,
  @Query('config_name') configName: string,
): Promise<GetLocationRes> {
  if (configName) {
    return await this.robotJobService.getLocations(
      warehouseId,
      getLocationReq,
      configName,
    );
  } else {
    throw new BadRequestException(
      '`config_name` parameter is not supported for this endpoint.'
    );
  }
}
}