import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reponse } from './reponse.entity';
import { CreateReponseDto, UpdateReponseDto } from './dto/reponse.dto';

@Injectable()
export class ReponseService {
  constructor(
    @InjectRepository(Reponse)
    private readonly reponseRepo: Repository<Reponse>,
  ) {}

  async findAll(): Promise<Reponse[]> {
    return this.reponseRepo.find({ relations: ['question'] });
  }

  async findOne(id: number): Promise<Reponse> {
    const reponse = await this.reponseRepo.findOne({
      where: { id },
      relations: ['question'],
    });
    if (!reponse) throw new NotFoundException(`Réponse #${id} introuvable`);
    return reponse;
  }

  async findByQuestion(questionId: number): Promise<Reponse[]> {
    return this.reponseRepo.find({
      where: { question: { id: questionId } },
    });
  }

  async create(dto: CreateReponseDto): Promise<Reponse> {
    const reponse = this.reponseRepo.create({
      ...dto,
      question: { id: dto.questionId },
    });
    return this.reponseRepo.save(reponse);
  }

  async update(id: number, dto: UpdateReponseDto): Promise<Reponse> {
    await this.reponseRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const reponse = await this.findOne(id);
    await this.reponseRepo.remove(reponse);
  }
}
