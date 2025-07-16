import { Controller, Post, Get, Body, BadRequestException, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OschestratorService } from './oschestrator.service';
import { 
  SetRobotAvailableReq, 
  SetRobotAvailableRes, 
  GetRobotStatusRes 
} from './dto/robot.dto';

@ApiTags('Orchestrator - Robot Management')
@Controller('orchestrator')
export class OschestratorController {
  constructor(private readonly oschestratorService: OschestratorService) {}

  @ApiOperation({ summary: 'Set a robot as available' })
  @ApiBody({
    type: SetRobotAvailableReq,
    description: 'Robot ID to set as available',
  })
  @ApiResponse({
    status: 200,
    description: 'Robot availability updated successfully',
    type: SetRobotAvailableRes,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid robot ID or robot not found',
  })
  @Post('robot/set-available')
  async setRobotAvailable(@Body() setRobotAvailableReq: SetRobotAvailableReq): Promise<SetRobotAvailableRes> {
    const success = await this.oschestratorService.setRobotAvailable(setRobotAvailableReq.robot_id);
    
    if (!success) {
      throw new BadRequestException(`Robot ${setRobotAvailableReq.robot_id} not found`);
    }

    return {
      message: `Robot ${setRobotAvailableReq.robot_id} set to available`,
      success: true,
    };
  }

  @ApiOperation({ summary: 'Get status of all robots' })
  @ApiResponse({
    status: 200,
    description: 'Robot statuses retrieved successfully',
    type: GetRobotStatusRes,
  })
  @Get('robots/status')
  async getRobotStatus(): Promise<GetRobotStatusRes> {
    const robots = await this.oschestratorService.getRobotStatuses();
    return { robots };
  }

  @ApiOperation({ summary: 'Get all task-robot assignments' })
  @ApiResponse({
    status: 200,
    description: 'Task-robot assignments retrieved successfully',
  })
  @Get('robots/assignments')
  getTaskRobotAssignments(): { assignments: { taskId: string; robotId: string }[] } {
    const assignments = this.oschestratorService.getTaskRobotAssignments();
    return { assignments };
  }

  @ApiOperation({ summary: 'Free all robots (emergency use)' })
  @ApiResponse({
    status: 200,
    description: 'All robots freed successfully',
  })
  @Post('robots/free-all')
  async freeAllRobots(): Promise<{ message: string; success: boolean }> {
    await this.oschestratorService.freeAllRobots();
    return {
      message: 'All robots have been freed',
      success: true,
    };
  }

  @ApiOperation({ summary: 'Create robots (delete all and create new)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 2 }
      },
      required: ['count']
    },
    description: 'Number of robots to create'
  })
  @ApiResponse({
    status: 200,
    description: 'Robots created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' },
        robots: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @Post('robots/create')
  async createRobots(@Body() body: { count: number }): Promise<{ message: string; success: boolean; robots: string[] }> {
    const result = await this.oschestratorService.createRobots(body.count);
    return result;
  }

  @ApiOperation({ summary: 'Get all robots in the system' })
  @ApiResponse({
    status: 200,
    description: 'All robots retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        robots: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              robot_id: { type: 'string' },
              available: { type: 'boolean' },
              last_task_id: { type: 'string', nullable: true },
              current_task_id: { type: 'string', nullable: true }
            }
          }
        }
      }
    }
  })
  @Get('robots/all')
  async getAllRobots(): Promise<{ robots: any[] }> {
    const robots = await this.oschestratorService.getAllRobots();
    return { robots };
  }


  @ApiOperation({ summary: 'Delete all robots and truncate batch_tasks table (CASCADE)' })
  @ApiResponse({
    status: 200,
    description: 'All robots and batch_tasks deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        success: { type: 'boolean' }
      }
    }
  })
  @Delete('robots/delete-all')
  async deleteAllRobotsAndBatches(): Promise<{ message: string; success: boolean }> {
    const result = await this.oschestratorService.deleteAllRobotsAndBatches();
    return result;
  }
}
