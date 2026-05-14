import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parcours } from './parcours.entity';
import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Parcours]), AuthModule],
  controllers: [ParcoursController],
  providers: [ParcoursService],
  exports: [ParcoursService, TypeOrmModule],
})
export class ParcoursModule {}
