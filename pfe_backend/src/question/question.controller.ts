import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { QuestionService } from './question.service';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@ApiTags('questions')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Get()
  findAll() {
    return this.questionService.findAll();
  }

  @Get('quiz/:quizId')
  findByQuiz(@Param('quizId', ParseIntPipe) quizId: number) {
    return this.questionService.findByQuiz(quizId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto) {
    return this.questionService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.remove(id);
  }
}
