import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';
import { ConfigMappingService } from './config-mapping.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  ConfigMappingResponseDto,
  ConfigMappingUpdateResponseDto,
  DeleteConfigDto,
  DeleteConfigQueryDto,
  DeleteConfigResponseDto,
  ConfigMappingBadRequestDto,
  ConfigMappingUnauthorizedDto,
  ConfigMappingNotFoundDto,
  ConfigMappingInternalServerErrorDto,
} from './dto/config-mapping.dto';

@ApiTags('Configuration Mapping')
@ApiSecurity('api-key')
@Controller('config-mapping')
export class ConfigMappingController {
  constructor(private readonly configMappingService: ConfigMappingService) {}

  @Post(':warehouse_id/create-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update create task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Create task data mapping updated successfully',
    type: ConfigMappingUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration - validation failed',
    type: ConfigMappingBadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async updateCreateTaskConfig(
    @Param('warehouse_id') warehouseId: string,
    @Body() createTaskConfigDto: CreateTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateCreateTaskConfig(
      warehouseId,
      createTaskConfigDto,
    );
  }

  @Post(':warehouse_id/update-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update update task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Update task data mapping updated successfully',
    type: ConfigMappingUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration - validation failed',
    type: ConfigMappingBadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async updateUpdateTaskConfig(
    @Param('warehouse_id') warehouseId: string,
    @Body() updateTaskConfigDto: UpdateTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateUpdateTaskConfig(
      warehouseId,
      updateTaskConfigDto,
    );
  }

  @Post(':warehouse_id/cancel-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cancel task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Cancel task data mapping updated successfully',
    type: ConfigMappingUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration - validation failed',
    type: ConfigMappingBadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async updateCancelTaskConfig(
    @Param('warehouse_id') warehouseId: string,
    @Body() cancelTaskConfigDto: CancelTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateCancelTaskConfig(
      warehouseId,
      cancelTaskConfigDto,
    );
  }

  @Post(':warehouse_id/get-location-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update get location data mapping for a warehouse',
  })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Get location data mapping updated successfully',
    type: ConfigMappingUpdateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration - validation failed',
    type: ConfigMappingBadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async updateGetLocationConfig(
    @Param('warehouse_id') warehouseId: string,
    @Body() getLocationConfigDto: GetLocationConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateGetLocationConfig(
      warehouseId,
      getLocationConfigDto,
    );
  }

  @Get(':warehouse_id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get configuration mapping for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration mapping retrieved successfully',
    type: ConfigMappingResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async getConfigMapping(
    @Param('warehouse_id') warehouseId: string,
  ): Promise<ConfigMappingResponseDto> {
    return this.configMappingService.getConfigMapping(warehouseId);
  }

  @Delete(':warehouse_id/config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete configuration mapping for a warehouse' })
  @ApiParam({
    name: 'warehouse_id',
    description: 'Warehouse ID',
    example: 'WH_001',
  })
  @ApiQuery({
    name: 'config_type',
    description: 'Type of configuration to delete',
    example: 'create_task',
    enum: ['create_task', 'update_task', 'cancel_task', 'get_location'],
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Configuration deleted successfully',
    type: DeleteConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid configuration type or validation failed',
    type: ConfigMappingBadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: ConfigMappingUnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse or configuration not found',
    type: ConfigMappingNotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: ConfigMappingInternalServerErrorDto,
  })
  async deleteConfig(
    @Param('warehouse_id') warehouseId: string,
    @Query() deleteConfigQueryDto: DeleteConfigQueryDto,
  ): Promise<DeleteConfigResponseDto> {
    return this.configMappingService.deleteConfig(
      warehouseId,
      deleteConfigQueryDto,
    );
  }
}
