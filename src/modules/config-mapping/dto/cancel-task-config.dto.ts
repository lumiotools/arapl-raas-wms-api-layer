import { IsString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class StringConfigDto {
  @IsString()
  object_type: string;
  @IsString()
  path: string;
  @IsOptional()
  default?: any;
}

export class CancelTaskConfigRootDto {
  @IsString()
  object_type: string;

  @ValidateNested()
  @Type(() => StringConfigDto)
  reason: StringConfigDto;

  @ValidateNested()
  @Type(() => StringConfigDto)
  timestamp: StringConfigDto;
}
