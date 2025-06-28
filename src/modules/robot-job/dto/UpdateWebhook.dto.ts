import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsOptional } from 'class-validator';

export class UpdateWebhookReq {
  @ApiProperty({
    description: 'Webhook URL for the warehouse',
    example: 'https://api.example.com/webhook/warehouse-updates',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  webhook_url?: string | null;
}

export class UpdateWebhookRes {
  @ApiProperty({
    description: 'Status of the webhook update operation',
    example: 'success',
  })
  status: string;

  @ApiProperty({
    description: 'Message describing the result of the operation',
    example: 'Webhook URL updated successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Updated warehouse information',
    example: {
      warehouse_id: 'WH_001',
      warehouse_name: 'Main Warehouse',
      webhook_url: 'https://api.example.com/webhook/warehouse-updates',
    },
  })
  warehouse: {
    warehouse_id: string;
    warehouse_name: string;
    webhook_url?: string | null;
  };
}
