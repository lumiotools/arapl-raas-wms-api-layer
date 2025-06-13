import { Controller } from '@nestjs/common';
import { OschestratorService } from './oschestrator.service';

@Controller('oschestrator')
export class OschestratorController {
  constructor(private readonly oschestratorService: OschestratorService) {}
}
