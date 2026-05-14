import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from './question.entity';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Question]), AuthModule],
  controllers: [QuestionController],
  providers: [QuestionService],
  exports: [QuestionService, TypeOrmModule],
})
export class QuestionModule {}
