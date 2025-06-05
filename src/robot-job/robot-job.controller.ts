import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RobotJobService } from './robot-job.service';
import { CreateRobotJobDto } from './dto/create-robot-job.dto';
import { UpdateRobotJobDto } from './dto/update-robot-job.dto';

@Controller('robot-job')
export class RobotJobController {
  constructor(private readonly robotJobService: RobotJobService) {}

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
