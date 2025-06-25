import { ApiProperty } from '@nestjs/swagger';

export class ConflictDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: 'A batch job with the same ID already exists.' })
  message: string;
}
