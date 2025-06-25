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
import { IsArray, ValidateNested, IsString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Task } from './Task_Generation.dto';

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
  @ApiProperty({
    description: 'List of tasks in the batch',
    type: [Task],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  tasks: Task[];
}
