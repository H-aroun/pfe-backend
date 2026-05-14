import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rapport } from './rapport.entity';
import { Scenario } from 'src/scenario/scenario.entity';
import { User } from 'src/users/user.entity';
import { RapportService } from './rapport.service';
import { RapportController } from './rapport.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Rapport, Scenario, User]), AuthModule],
  controllers: [RapportController],
  providers: [RapportService],
  exports: [RapportService, TypeOrmModule],
})
export class RapportModule {}
