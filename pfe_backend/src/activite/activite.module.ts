import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Activite } from './activite.entity';
import { ActiviteService } from './activite.service';
import { ActiviteController } from './activite.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Activite]), AuthModule],
  controllers: [ActiviteController],
  providers: [ActiviteService],
  exports: [ActiviteService, TypeOrmModule],
})
export class ActiviteModule {}
