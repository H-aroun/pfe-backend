import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activite } from './activite.entity';
import { CreateActiviteDto, UpdateActiviteDto } from './dto/activite.dto';

@Injectable()
export class ActiviteService {
  constructor(
    @InjectRepository(Activite)
    private readonly activiteRepo: Repository<Activite>,
  ) {}

  async findAll(): Promise<Activite[]> {
    return this.activiteRepo.find({ relations: ['sequence', 'quiz'] });
  }

  async findOne(id: number): Promise<Activite> {
    const activite = await this.activiteRepo.findOne({
      where: { id },
      relations: [
        'sequence',
        'quiz',
        'quiz.questions',
        'quiz.questions.reponses',
      ],
    });
    if (!activite) throw new NotFoundException(`Activité #${id} introuvable`);
    return activite;
  }

  async findBySequence(sequenceId: number): Promise<Activite[]> {
    return this.activiteRepo.find({
      where: { sequence: { id: sequenceId } },
      order: { ordre: 'ASC' },
      relations: ['quiz'],
    });
  }

  async create(dto: CreateActiviteDto): Promise<Activite> {
    const activite = this.activiteRepo.create({
      ...dto,
      sequence: { id: dto.sequenceId },
    });
    return this.activiteRepo.save(activite);
  }

  async update(id: number, dto: UpdateActiviteDto): Promise<Activite> {
    await this.activiteRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const activite = await this.findOne(id);
    await this.activiteRepo.remove(activite);
  }
}
