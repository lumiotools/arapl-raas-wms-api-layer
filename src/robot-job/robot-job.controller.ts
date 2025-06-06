import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';
import { TaskGenerationReq, TaskGenerationRes } from './dto/Task_Generation.dto';
import { TaskUpdateReq, TaskUpdateRes } from './dto/Task_Update.dto';
import { TaskCancelReq, TaskCancelRes } from './dto/Task_Cancel.dto';

@Controller('robot-job')
export class RobotJobController {
  constructor(private readonly robotJobService: RobotJobService) {}

  @Post(':warehouse_id/create_task')
  async createTask(@Param('warehouse_id') warehouseId: string, @Body() createRobotJobDto: TaskGenerationReq) : Promise<TaskGenerationRes> {
    return await this.robotJobService.createTask(warehouseId, createRobotJobDto);
  }

  @Patch(':warehouse_id/update_task')
  async updateTask(@Param('warehouse_id') warehouseId: string, @Body() updateRobotJobDto: TaskUpdateReq): Promise<TaskUpdateRes> {
    return await this.robotJobService.updateTask(warehouseId, updateRobotJobDto);
  }

  @Patch(':warehouse_id/cancel_task')
  async cancelTask(@Param('warehouse_id') warehouseId: string, @Body() updateRobotJobDto: TaskCancelReq): Promise<TaskCancelRes> {
    return  await this.robotJobService.cancelTask(warehouseId, updateRobotJobDto);
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
  update(@Param('id') id: string, @Body() updateRobotJobDto: UpdateRobotJobDto) {
    return this.robotJobService.update(+id, updateRobotJobDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.robotJobService.remove(+id);
  }
}
