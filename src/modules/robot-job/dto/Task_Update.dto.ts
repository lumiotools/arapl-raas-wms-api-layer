// import { Attribute, Dimension, Wait } from './Task_Generation.dto';
// import {
//   IsString,
//   IsNotEmpty,
//   IsOptional,
//   IsArray,
//   ValidateNested,
//   IsNumber,
// } from 'class-validator';
// import { Type } from 'class-transformer';

// export class Cargo {
//   @IsString()
//   @IsNotEmpty()
//   cargo_code: string;

//   @ValidateNested({each: true })
//   @Type(() => Dimension)
//   cargo_dimension: Dimension;

//   @IsOptional()
//   @IsNumber()
//   cargo_quantity?: number;

//   @IsOptional()
//   @IsNumber()
//   cargo_weight?: number;
// }

// export class Location {
//   @IsString()
//   @IsNotEmpty()
//   location_id: string;

//   @ValidateNested({each: true })
//   @Type(() => Dimension)
//   location_dimension: Dimension;

//   @IsOptional()
//   @IsNumber()
//   cargo_quantity?: number;
// }

// export class Task {
//   @IsString()
//   @IsNotEmpty()
//   task_id: string;

//   @IsOptional()
//   @IsString()
//   task_dependency?: string;

//   @ValidateNested({each: true })
//   @Type(() => Location)
//   start_location: Location;

//   @ValidateNested({each: true })
//   @Type(() => Location)
//   end_location: Location;

//   @IsOptional()
//   @ValidateNested({each: true })
//   @Type(() => Wait)
//   wait_time ?: Wait;

//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Cargo)
//   cargos: Cargo[];
// }

// export class TaskUpdateReq {
//   @IsString()
//   @IsNotEmpty()
//   batch_job_id: string;

//   @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => Task)
//   updates: Task[];

//   @IsOptional()
//   @IsString()
//   timestamp?: string;
// }

// export class TaskUpdateRes {
//   @IsString()
//   @IsNotEmpty()
//   batch_id: string;

//   @IsString()
//   @IsNotEmpty()
//   status: string;

//   @IsString()
//   @IsNotEmpty()
//   updated_at: string;

//   @IsString()
//   @IsNotEmpty()
//   message: string;
// }
import { Attribute, Dimension, Wait } from './Task_Generation.dto';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Cargo {
  @ApiProperty({ example: 'CARGO_123' })
  @IsString()
  @IsNotEmpty()
  cargo_code: string;

  @ApiProperty({ type: Dimension })
  @ValidateNested()
  @Type(() => Dimension)
  cargo_dimension: Dimension;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  cargo_quantity?: number;

  @ApiPropertyOptional({ example: 25.5 })
  @IsOptional()
  @IsNumber()
  cargo_weight?: number;
}

export class Location {
  @ApiProperty({ example: 'LOC_001' })
  @IsString()
  @IsNotEmpty()
  location_id: string;

  @ApiProperty({ type: Dimension })
  @ValidateNested()
  @Type(() => Dimension)
  location_dimension: Dimension;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  cargo_quantity?: number;
}

export class Task {
  @ApiProperty({ example: 'TASK_001' })
  @IsString()
  @IsNotEmpty()
  task_id: string;

  @ApiPropertyOptional({ example: 'TASK_000' })
  @IsOptional()
  @IsString()
  task_dependency?: string;

  @ApiProperty({ type: Location })
  @ValidateNested()
  @Type(() => Location)
  start_location: Location;

  @ApiProperty({ type: Location })
  @ValidateNested()
  @Type(() => Location)
  end_location: Location;

  @ApiPropertyOptional({ type: Wait })
  @IsOptional()
  @ValidateNested()
  @Type(() => Wait)
  wait_time?: Wait;

  @ApiProperty({ type: [Cargo] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Cargo)
  cargos: Cargo[];
}

export class TaskUpdateReq {
  @ApiProperty({ example: 'BATCH_123' })
  @IsString()
  @IsNotEmpty()
  batch_job_id: string;

  @ApiProperty({ type: [Task] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Task)
  updates: Task[];

  @ApiPropertyOptional({ example: '2024-06-01T10:00:00Z' })
  @IsOptional()
  @IsString()
  timestamp?: string;
}

export class TaskUpdateRes {
  @ApiProperty({ example: 'BATCH_123' })
  @IsString()
  @IsNotEmpty()
  batch_id: string;

  @ApiProperty({ example: 'success' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: '2024-06-01T10:30:00Z' })
  @IsString()
  @IsNotEmpty()
  updated_at: string;

  @ApiProperty({ example: 'Tasks updated successfully.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
