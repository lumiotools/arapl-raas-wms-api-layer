import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean } from 'class-validator';

export class SetRobotAvailableReq {
  @ApiProperty({ example: 'ROBOT-001', description: 'Robot ID to set as available' })
  @IsString()
  @IsNotEmpty()
  robot_id: string;
}

export class SetRobotAvailableRes {
  @ApiProperty({ example: 'Robot ROBOT-001 set to available' })
  @IsString()
  message: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  success: boolean;
}

export class RobotStatusDto {
  @ApiProperty({ example: 'ROBOT-001' })
  @IsString()
  robotId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  available: boolean;
}

export class GetRobotStatusRes {
  @ApiProperty({ type: [RobotStatusDto] })
  robots: RobotStatusDto[];
}
