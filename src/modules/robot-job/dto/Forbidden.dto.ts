import { ApiProperty } from '@nestjs/swagger';

export class ForbiddenDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({ example: 'Forbidden' })
  error: string;

  @ApiProperty({ example: 'You do not have permission to access this resource.' })
  message: string;
}
