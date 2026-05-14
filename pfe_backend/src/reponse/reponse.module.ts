import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reponse } from './reponse.entity';
import { ReponseService } from './reponse.service';
import { ReponseController } from './reponse.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Reponse]), AuthModule],
  controllers: [ReponseController],
  providers: [ReponseService],
  exports: [ReponseService, TypeOrmModule],
})
export class ReponseModule {}
