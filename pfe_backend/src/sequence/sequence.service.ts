import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sequence } from './sequence.entity';
import { CreateSequenceDto, UpdateSequenceDto } from './dto/sequence.dto';

@Injectable()
export class SequenceService {
  constructor(
    @InjectRepository(Sequence)
    private readonly sequenceRepo: Repository<Sequence>,
  ) {}

  async findAll(): Promise<Sequence[]> {
    return this.sequenceRepo.find({ relations: ['module', 'activites'] });
  }

  async findOne(id: number): Promise<Sequence> {
    const sequence = await this.sequenceRepo.findOne({
      where: { id },
      relations: ['module', 'activites', 'activites.quiz'],
    });
    if (!sequence) throw new NotFoundException(`Séquence #${id} introuvable`);
    return sequence;
  }

  async findByModule(moduleId: number): Promise<Sequence[]> {
    return this.sequenceRepo.find({
      where: { module: { id: moduleId } },
      relations: ['activites'],
    });
  }

  async create(dto: CreateSequenceDto): Promise<Sequence> {
    const sequence = this.sequenceRepo.create({
      ...dto,
      module: { id: dto.moduleId },
    });
    return this.sequenceRepo.save(sequence);
  }

  async update(id: number, dto: UpdateSequenceDto): Promise<Sequence> {
    await this.sequenceRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const sequence = await this.findOne(id);
    await this.sequenceRepo.remove(sequence);
  }
}
