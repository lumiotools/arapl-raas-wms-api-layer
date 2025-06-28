import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigMappingController } from './config-mapping.controller';
import { ConfigMappingService } from './config-mapping.service';
import { Warehouse } from '../robot-job/entities/warehouse.entity';
import { AuthenticationMiddleware } from '../../middlewares/authentication.middleware';
import { Validator } from 'class-validator';

@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  controllers: [ConfigMappingController],
  providers: [ConfigMappingService, AuthenticationMiddleware, Validator],
  exports: [ConfigMappingService],
})
export class ConfigMappingModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes(ConfigMappingController);
  }
}
