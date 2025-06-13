import { PartialType } from '@nestjs/mapped-types';
import { CreateRobotJobDto } from './create-robot-job.dto';

export class UpdateRobotJobDto extends PartialType(CreateRobotJobDto) {}
