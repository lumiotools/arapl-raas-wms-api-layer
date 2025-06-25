import { ApiProperty } from '@nestjs/swagger';

export class NotFoundDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Not Found' })
  error: string;

  @ApiProperty({ example: "Batch job with ID '123' not found in warehouse '456'." })
  message: string;
}
