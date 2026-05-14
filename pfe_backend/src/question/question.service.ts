import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Question } from './question.entity';
import { CreateQuestionDto, UpdateQuestionDto } from './dto/question.dto';

@Injectable()
export class QuestionService {
  constructor(
    @InjectRepository(Question)
    private readonly questionRepo: Repository<Question>,
  ) {}

  async findAll(): Promise<Question[]> {
    return this.questionRepo.find({ relations: ['quiz', 'reponses'] });
  }

  async findOne(id: number): Promise<Question> {
    const question = await this.questionRepo.findOne({
      where: { id },
      relations: ['quiz', 'reponses'],
    });
    if (!question) throw new NotFoundException(`Question #${id} introuvable`);
    return question;
  }

  async findByQuiz(quizId: number): Promise<Question[]> {
    return this.questionRepo.find({
      where: { quiz: { id: quizId } },
      order: { ordre: 'ASC' },
      relations: ['reponses'],
    });
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    const question = this.questionRepo.create({
      ...dto,
      quiz: { id: dto.quizId },
    });
    return this.questionRepo.save(question);
  }

  async update(id: number, dto: UpdateQuestionDto): Promise<Question> {
    await this.questionRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const question = await this.findOne(id);
    await this.questionRepo.remove(question);
  }
}
