import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WarehouseConfigService } from './warehouse-config.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  WarehouseConfigResponseDto,
  WarehouseConfigUpdateResponseDto,
} from './dto/warehouse-config.dto';

@ApiTags('Warehouse Configuration')
@Controller('warehouse-config')
export class WarehouseConfigController {
  constructor(
    private readonly warehouseConfigService: WarehouseConfigService,
  ) {}

  @Post(':warehouseId/create-task-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update create task configuration for a warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: 200,
    description: 'Create task configuration updated successfully',
    type: WarehouseConfigUpdateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
  })
  async updateCreateTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() createTaskConfigDto: CreateTaskConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    return this.warehouseConfigService.updateCreateTaskConfig(
      warehouseId,
      createTaskConfigDto,
    );
  }

  @Post(':warehouseId/update-task-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update update task configuration for a warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: 200,
    description: 'Update task configuration updated successfully',
    type: WarehouseConfigUpdateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
  })
  async updateUpdateTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() updateTaskConfigDto: UpdateTaskConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    return this.warehouseConfigService.updateUpdateTaskConfig(
      warehouseId,
      updateTaskConfigDto,
    );
  }

  @Post(':warehouseId/cancel-task-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cancel task configuration for a warehouse' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: 200,
    description: 'Cancel task configuration updated successfully',
    type: WarehouseConfigUpdateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
  })
  async updateCancelTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() cancelTaskConfigDto: CancelTaskConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    return this.warehouseConfigService.updateCancelTaskConfig(
      warehouseId,
      cancelTaskConfigDto,
    );
  }

  @Post(':warehouseId/get-location-config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update get location configuration for a warehouse',
  })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: 200,
    description: 'Get location configuration updated successfully',
    type: WarehouseConfigUpdateResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
  })
  async updateGetLocationConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() getLocationConfigDto: GetLocationConfigDto,
  ): Promise<WarehouseConfigUpdateResponseDto> {
    return this.warehouseConfigService.updateGetLocationConfig(
      warehouseId,
      getLocationConfigDto,
    );
  }

  @Get(':warehouseId')
  @ApiOperation({ summary: 'Get warehouse configuration' })
  @ApiParam({ name: 'warehouseId', description: 'Warehouse ID' })
  @ApiResponse({
    status: 200,
    description: 'Warehouse configuration retrieved successfully',
    type: WarehouseConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
  })
  async getWarehouseConfig(
    @Param('warehouseId') warehouseId: string,
  ): Promise<WarehouseConfigResponseDto> {
    return this.warehouseConfigService.getWarehouseConfig(warehouseId);
  }
}
