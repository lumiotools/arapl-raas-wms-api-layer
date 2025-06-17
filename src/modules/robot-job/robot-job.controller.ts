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
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import {
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';
import { config } from 'process';

@Controller('robot-job')
export class RobotJobController {
  private readonly logger = new Logger(RobotJobController.name);
  private readonly validator = new Validator();

  constructor(private readonly robotJobService: RobotJobService) {}

  @Post(':warehouse_id/create_task')
  async unifiedCreateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Query('config_name') configName?: string,
  ): Promise<TaskGenerationRes> {
    const structuredDto = plainToInstance(TaskGenerationReq, body);
    const validationErrors = await this.validator.validate(structuredDto);

    if (validationErrors.length === 0) {
      const result = await this.robotJobService.createTask(warehouseId, structuredDto);
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

  @Patch(':warehouse_id/update_task')
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

  @Patch(':warehouse_id/cancel_task')
  async unifiedCancelTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() body: any,
    @Query('config_name') configName?: string,
  ): Promise<TaskCancelRes | BatchCancelRes> {
    const singleTaskDto = plainToInstance(TaskCancelReq, body);
    const batchDto = plainToInstance(BatchCancelReq, body);

    const singleErrors = await this.validator.validate(singleTaskDto);
    const batchErrors = await this.validator.validate(batchDto);

    const isSingleValid = singleErrors.length === 0;
    const isBatchValid = batchErrors.length === 0;

    if (isSingleValid && !isBatchValid) {
      return this.robotJobService.cancelTask(warehouseId, singleTaskDto);
    }

    if (isBatchValid && !isSingleValid) {
      return this.robotJobService.cancelTask(warehouseId, batchDto);
    }

    if (configName) {
      const result = await this.robotJobService.cancelUnstructuredTask(
        warehouseId,
        configName,
        'cancel_task', // Specify the operation type
        body,
      );
      if (result.status === 'error') {
        throw new BadRequestException(result.message);
      }
      return result;
    }

    this.logger.error('Invalid cancellation request body.');
    this.logger.debug(
      'Single Task Validation Errors:',
      JSON.stringify(singleErrors, null, 2),
    );
    this.logger.debug(
      'Batch Task Validation Errors:',
      JSON.stringify(batchErrors, null, 2),
    );

    throw new BadRequestException(
      'Request body is not a valid cancellation structure (or is ambiguous) and no `config_name` was provided for transformation.',
    );
  }

  @Post(':warehouse_id/get_empty_locations')
  async getEmptyLocations(
    @Param('warehouse_id') warehouseId: string,
    @Body() getLocationReq: GetLocationReq,
    @Query('config_name') configName: string,
  ): Promise<GetLocationRes> {
    return await this.robotJobService.getEmptyLocations(
      warehouseId,
      getLocationReq,
      configName,
    );
  }

  @Post()
  create(@Body() createRobotJobDto: CreateRobotJobDto) {
    return this.robotJobService.create(createRobotJobDto);
  }

  @Get()
  findAll() {
    return this.robotJobService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.robotJobService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRobotJobDto: UpdateRobotJobDto,
  ) {
    return this.robotJobService.update(+id, updateRobotJobDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.robotJobService.remove(+id);
  }
}
