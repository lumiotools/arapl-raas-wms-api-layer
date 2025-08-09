import { ApiProperty } from '@nestjs/swagger';

export class GetIdleRobotsRes {
  @ApiProperty({
    description: 'List of idle robot IDs',
    type: [String],
    example: [
      '3f8c1f70-6b63-4b54-8f2d-b6f3d134a7a9',
      'a1d5c3e2-9b4f-4d6a-8f2c-7b8d9e0f1a2b',
    ],
  })
  robots: string[];
}
