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
import { config } from 'process';
import { GetTasksParamsDto, GetTasksResponseDto } from './dto/GetTasks.dto';

@Controller('robot-job')
export class RobotJobController {
  private readonly logger = new Logger(RobotJobController.name);
  private readonly validator = new Validator();

  constructor(private readonly robotJobService: RobotJobService) {}

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
  
  @Post(':warehouse_id/tasks')
  async unifiedCreateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Query('config_name') configName?: string,
  ): Promise<TaskGenerationRes> {
    const structuredDto = plainToInstance(TaskGenerationReq, body);
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length === 0) {
      const result = await this.robotJobService.createTask(
        warehouseId,
        structuredDto,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.status);
      }
      return result;
    }

    if (configName) {
      const result = await this.robotJobService.createUnstructuredTask(
        warehouseId,
        configName,
        'create_task', // Specify the operation type
        body,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.status);
      }
      return result;
    }

    throw new BadRequestException(
      'Request body is not a valid task structure and no `config_name` was provided for transformation.',
    );
  }

  @Patch(':warehouse_id/tasks')
  async unifiedUpdateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Query('config_name') configName?: string,
  ): Promise<TaskUpdateRes> {
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

    if (configName) {
      const result = await this.robotJobService.updateUnstructuredTask(
        warehouseId,
        configName,
        'update_task', // Specify the operation type
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

  @Patch(':warehouse_id/tasks/:batch_id/cancel')
  async cancelBatch(
    @Param('warehouse_id') warehouseId: string,
    @Param('batch_id') batchId: string,
    @Body() body: CancelReq,
    @Query('config_name') configName?: string
  ): Promise<BatchCancelRes> {
    if (configName) {
      const result = await this.robotJobService.cancelUnstructuredBatch(
        warehouseId,
        batchId,
        configName,
        'cancel_task', // Specify the operation type
        body,
      );
      if (result.status !== 'success') {
        throw new BadRequestException(result.message);
      }
      return result;
    }
    const batchDto = plainToInstance(CancelReq, body);
    const validationErrors = await this.validator.validate(batchDto);
    console.log('structuredDto: ', batchDto);
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

  @Patch(':warehouse_id/tasks/:batch_id/:task_id/cancel')
  async cancelTask(
    @Param('warehouse_id') warehouseId: string,
    @Param('batch_id') batchId: string,
    @Param('task_id') taskId: string,
    @Body() body: CancelReq,
    @Query('config_name') configName?: string
  ): Promise<TaskCancelRes> {
    if (configName) {
      const result = await this.robotJobService.cancelUnstructuredTask(
        warehouseId,
        batchId,
        taskId,
        configName,
        'cancel_task', // Specify the operation type
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
        configName
      );
    } else {
      throw new BadRequestException(
        '`config_name` parameter is not supported for this endpoint.'
      );
    }
  }

}
