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
import { ConfigMappingService } from './config-mapping.service';
import {
  CreateTaskConfigDto,
  UpdateTaskConfigDto,
  CancelTaskConfigDto,
  GetLocationConfigDto,
  ConfigMappingResponseDto,
  ConfigMappingUpdateResponseDto,
  BadRequestDto,
  UnauthorizedDto,
  NotFoundDto,
  InternalServerErrorDto,
} from './dto/config-mapping.dto';

@ApiTags('Configuration Mapping')
@Controller('config-mapping')
export class ConfigMappingController {
  constructor(private readonly configMappingService: ConfigMappingService) {}

  @Post(':warehouseId/create-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update create task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouseId',
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
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  async updateCreateTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() createTaskConfigDto: CreateTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateCreateTaskConfig(
      warehouseId,
      createTaskConfigDto,
    );
  }

  @Post(':warehouseId/update-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update update task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouseId',
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
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  async updateUpdateTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() updateTaskConfigDto: UpdateTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateUpdateTaskConfig(
      warehouseId,
      updateTaskConfigDto,
    );
  }

  @Post(':warehouseId/cancel-task-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cancel task data mapping for a warehouse' })
  @ApiParam({
    name: 'warehouseId',
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
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  async updateCancelTaskConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() cancelTaskConfigDto: CancelTaskConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateCancelTaskConfig(
      warehouseId,
      cancelTaskConfigDto,
    );
  }

  @Post(':warehouseId/get-location-data-mapping')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update get location data mapping for a warehouse',
  })
  @ApiParam({
    name: 'warehouseId',
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
    type: BadRequestDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication token missing or invalid',
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  async updateGetLocationConfig(
    @Param('warehouseId') warehouseId: string,
    @Body() getLocationConfigDto: GetLocationConfigDto,
  ): Promise<ConfigMappingUpdateResponseDto> {
    return this.configMappingService.updateGetLocationConfig(
      warehouseId,
      getLocationConfigDto,
    );
  }

  @Get(':warehouseId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get configuration mapping for a warehouse' })
  @ApiParam({
    name: 'warehouseId',
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
    type: UnauthorizedDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Warehouse not found',
    type: NotFoundDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Unexpected internal server error',
    type: InternalServerErrorDto,
  })
  async getConfigMapping(
    @Param('warehouseId') warehouseId: string,
  ): Promise<ConfigMappingResponseDto> {
    return this.configMappingService.getConfigMapping(warehouseId);
  }
}
