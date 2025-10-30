// import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
// import { Type } from 'class-transformer';
// import { Task } from './Task_Generation.dto';

// export class GetTasksParamsDto {
//   @IsString()
//   @IsNotEmpty()
//   warehouse_id: string;

//   @IsString()
//   @IsNotEmpty()
//   batch_id: string;
// }

// export class GetTasksResponseDto {
//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Task)
//   tasks: Task[];
// }
import {
  IsArray,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task, batch_type } from './Task_Generation.dto';

export class GetTasksParamsDto {
  @ApiProperty({
    description: 'Warehouse identifier',
    example: 'WH_001',
  })
  @IsString()
  @IsNotEmpty()
  warehouse_id: string;

  @ApiProperty({
    description: 'Batch identifier',
    example: 'BATCH_123',
  })
  @IsString()
  @IsNotEmpty()
  batch_id: string;
}

export class GetTasksResponseDto {
  @ApiProperty({ example: 'UNIQUE_BATCH_ID' })
  @IsString()
  @IsNotEmpty()
  batch_job_id: string;

  @ApiProperty({ example: 0 })
  @IsNumber()
  batch_priority: number;

  @ApiProperty({ enum: batch_type })
  @IsEnum(batch_type)
  batch_type: batch_type;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  batch_frequency?: number;

  @ApiProperty({ example: 'task_in_progress' })
  @IsString()
  @IsNotEmpty()
  batch_job_status: string;

  @ApiProperty({ type: [Task] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  tasks: Task[];
}
