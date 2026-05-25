import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quiz } from './quiz.entity';
import { CreateQuizDto, UpdateQuizDto } from './dto/quiz.dto';
import { Activite } from 'src/activite/activite.entity';

@Injectable()
export class QuizService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepo: Repository<Quiz>,
    @InjectRepository(Activite)
    private readonly activiteRepo: Repository<Activite>,
  ) {}

  async findAll(): Promise<Quiz[]> {
    return this.quizRepo.find({ relations: ['questions', 'activite'] });
  }

  async findOne(id: number): Promise<Quiz> {
    const quiz = await this.quizRepo.findOne({
      where: { id },
      relations: ['questions', 'questions.reponses', 'activite'],
    });
    if (!quiz) throw new NotFoundException(`Quiz #${id} introuvable`);
    return quiz;
  }

  async findByActivite(activiteId: number): Promise<Quiz | null> {
    return this.quizRepo.findOne({
      where: { activite: { id: activiteId } },
      relations: ['questions', 'questions.reponses', 'activite'],
    });
  }

  async create(dto: CreateQuizDto): Promise<Quiz> {
    const activite = await this.activiteRepo.findOne({
      where: { id: dto.activiteId },
    });
    if (!activite)
      throw new NotFoundException(`Activité #${dto.activiteId} introuvable`);

    const quiz = this.quizRepo.create({
      titre: dto.titre,
      description: dto.description,
      tentatives: dto.tentatives,
      scorePourReussir: dto.scorePourReussir,
    });
    const saved = await this.quizRepo.save(quiz);

    activite.quiz = saved;
    await this.activiteRepo.save(activite);
    return saved;
  }

  async update(id: number, dto: UpdateQuizDto): Promise<Quiz> {
    await this.quizRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const quiz = await this.findOne(id);
    await this.quizRepo.remove(quiz);
  }
}
