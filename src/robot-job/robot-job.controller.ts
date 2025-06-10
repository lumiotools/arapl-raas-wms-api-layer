import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import {
  Task,
  TaskGenerationReq,
  TaskGenerationRes,
} from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';
import { BatchCancelReq, BatchCancelRes } from './dto/Batch_Cancel.dto';
import { GetLocationReq, GetLocationRes } from './dto/GetLocation.dto';

@Controller('robot-job')
export class RobotJobController {
  constructor(private readonly robotJobService: RobotJobService) {}

  @Post(':warehouse_id/create_task')
  async createTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() createRobotJobDto: TaskGenerationReq,
  ): Promise<TaskGenerationRes> {
    return await this.robotJobService.createTask(
      warehouseId,
      createRobotJobDto,
    );
  }

  @Post(':warehouse_id/create_raw_task/:config_name')
  async createUnstructuredTask(
    @Param('warehouse_id') warehouseId: string,
    @Param('config_name') configName: string,
    @Body() createRobotJobDto: any,
  ): Promise<any> {
    const result = await this.robotJobService.createUnstructuredTask(
      warehouseId,
      configName,
      createRobotJobDto,
    );

    if (result.status === 'error') {
      throw new BadRequestException(result.message);
    }

    return result;
  }

  @Patch(':warehouse_id/update_task')
  async updateTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() updateRobotJobDto: TaskUpdateReq,
  ): Promise<TaskUpdateRes> {
    return await this.robotJobService.updateTask(
      warehouseId,
      updateRobotJobDto,
    );
  }

  @Patch(':warehouse_id/cancel_task')
  async cancelTask(
    @Param('warehouse_id') warehouseId: string,
    @Body() updateRobotJobDto: TaskCancelReq | BatchCancelReq,
  ): Promise<TaskCancelRes | BatchCancelRes> {
    return await this.robotJobService.cancelTask(
      warehouseId,
      updateRobotJobDto,
    );
  }

  @Post(':warehouse_id/get_empty_locations')
  async getEmptyLocations(
    @Param('warehouse_id') warehouseId: string,
    @Body() GetLocationReq: GetLocationReq,
  ): Promise<GetLocationRes> {
    return await this.robotJobService.getEmptyLocations(
      warehouseId,
      GetLocationReq,
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
