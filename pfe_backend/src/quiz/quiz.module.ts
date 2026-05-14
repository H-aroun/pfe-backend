import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quiz } from './quiz.entity';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { AuthModule } from 'src/auth/auth.module';
import { Activite } from 'src/activite/activite.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quiz, Activite]), AuthModule],
  controllers: [QuizController],
  providers: [QuizService],
  exports: [QuizService, TypeOrmModule],
})
export class QuizModule {}
