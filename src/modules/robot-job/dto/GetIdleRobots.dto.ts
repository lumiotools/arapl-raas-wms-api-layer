import { ApiProperty } from '@nestjs/swagger';

class RobotDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'idle', description: 'Current status of the robot' })
  status: string;
}

export class GetIdleRobotsRes {
  @ApiProperty({
    description: 'List of robots with their ID and status',
    type: [RobotDto],
    example: [
      { id: '550e8400-e29b-41d4-a716-446655440000', status: 'idle' },
      { id: '8b7e5c9d-3a42-4f1d-9f1a-123456789abc', status: 'idle' },
    ],
  })
  robots: RobotDto[];
}
