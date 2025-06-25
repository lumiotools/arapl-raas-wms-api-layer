import { ApiProperty } from '@nestjs/swagger';

export class InternalServerErrorDto {
  @ApiProperty({ example: 500 })
  statusCode: number;

  @ApiProperty({ example: 'Internal Server Error' })
  error: string;

  @ApiProperty({ example: 'An unexpected error occurred on the server.' })
  message: string;
}
