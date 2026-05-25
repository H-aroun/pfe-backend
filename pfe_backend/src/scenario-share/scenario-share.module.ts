import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScenarioShare } from './scenario-share.entity';
import { ScenarioShareService } from './scenario-share.service';
import { ScenarioShareController } from './scenario-share.controller';
import { AuthModule } from 'src/auth/auth.module';
import { Scenario } from 'src/scenario/scenario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ScenarioShare, Scenario]), AuthModule],
  controllers: [ScenarioShareController],
  providers: [ScenarioShareService],
  exports: [ScenarioShareService],
})
export class ScenarioShareModule {}
