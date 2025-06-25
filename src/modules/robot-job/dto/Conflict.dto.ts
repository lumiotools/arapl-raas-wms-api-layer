import { ApiProperty } from '@nestjs/swagger';

export class ConflictDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: 'Batch job BATCH-20250618-112131-001 is not cancellable or not in pending state and cannot be cancelled.' })
  message: string;
}
