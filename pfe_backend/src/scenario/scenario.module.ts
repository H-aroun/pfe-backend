import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scenario } from './scenario.entity';
import { ScenarioService } from './scenario.service';
import { ScenarioController } from './scenario.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Scenario]), AuthModule],
  controllers: [ScenarioController],
  providers: [ScenarioService],
  exports: [ScenarioService, TypeOrmModule],
})
export class ScenarioModule {}
