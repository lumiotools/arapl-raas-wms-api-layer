import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Task } from './Task_Generation.dto';

export class GetTasksParamsDto {
  @IsString()
  @IsNotEmpty()
  warehouse_id: string;

  @IsString()
  @IsNotEmpty()
  batch_id: string;
}

export class GetTasksResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  tasks: Task[];
}
