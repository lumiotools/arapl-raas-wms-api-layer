// // dto/ErrorResponse.dto.ts
// import { ApiProperty } from '@nestjs/swagger';

// export class ErrorResponseDto {
//   @ApiProperty({ example: 'error' })
//   status: string;

//   @ApiProperty({ example: 'Batch job with id XYZ already exists.' })
//   message: string;
// }

// import { ApiProperty } from '@nestjs/swagger';

// export class ErrorResponseDto {
//   @ApiProperty({ example: 'error', description: 'Status of the response' })
//   status: string;

//   @ApiProperty({ example: 'Detailed error message here', description: 'Human-readable error message' })
//   message: string;
// }
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 'error' })
  status: string;

  @ApiProperty({ example: 'Error message here.' })
  message: string;

 
}