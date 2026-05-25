import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Sequence } from './sequence.entity';
import { CreateSequenceDto, UpdateSequenceDto } from './dto/sequence.dto';
import { ReorderItemDto } from 'src/common/dto/reorder.dto';

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
      order: { ordre: 'ASC' },
      relations: ['activites'],
    });
  }

  async create(dto: CreateSequenceDto): Promise<Sequence> {
    const ordre =
      dto.ordre ??
      (await this.sequenceRepo.count({
        where: { module: { id: dto.moduleId } },
      }));
    const sequence = this.sequenceRepo.create({
      ...dto,
      ordre,
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

  async reorderByModule(
    moduleId: number,
    items: ReorderItemDto[],
  ): Promise<Sequence[]> {
    if (!items.length) return this.findByModule(moduleId);

    const ids = items.map((item) => item.id);
    const sequences = await this.sequenceRepo.find({
      where: { id: In(ids), module: { id: moduleId } },
      relations: ['module'],
    });

    if (sequences.length !== ids.length) {
      throw new NotFoundException(
        'Une ou plusieurs séquences sont introuvables dans ce module',
      );
    }

    await this.sequenceRepo.manager.transaction(async (manager) => {
      await Promise.all(
        items.map((item) =>
          manager.update(Sequence, item.id, { ordre: item.ordre }),
        ),
      );
    });

    return this.findByModule(moduleId);
  }
}
