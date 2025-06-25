import { ApiProperty } from '@nestjs/swagger';

export class BadRequestDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  error: string;

  @ApiProperty({ example: 'Invalid input provided for batch ID.' })
  message: string;
}
