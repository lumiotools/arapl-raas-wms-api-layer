import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateLocationTrackingReq {
  @ApiProperty({
    description: 'Whether locations are managed by customer',
    example: true,
  })
  @IsBoolean()
  locations_customer_managed: boolean;
}

export class UpdateLocationTrackingRes {
  @ApiProperty({
    description: 'Status of the location tracking update operation',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Location tracking settings updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated warehouse information',
    example: {
      warehouse_id: 'WH_001',
      warehouse_name: 'Main Warehouse',
      locations_customer_managed: true,
    },
  })
  warehouse: {
    warehouse_id: string;
    warehouse_name: string;
    locations_customer_managed: boolean;
  };
}
