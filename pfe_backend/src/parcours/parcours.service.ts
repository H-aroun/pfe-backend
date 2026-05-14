import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Parcours } from './parcours.entity';
import { CreateParcoursDto, UpdateParcoursDto } from './dto/parcours.dto';

@Injectable()
export class ParcoursService {
  constructor(
    @InjectRepository(Parcours)
    private readonly parcoursRepo: Repository<Parcours>,
  ) {}

  async findAll(): Promise<Parcours[]> {
    return this.parcoursRepo.find({ relations: ['scenario'] });
  }

  async findOne(id: number): Promise<Parcours> {
    const parcours = await this.parcoursRepo.findOne({
      where: { id },
      relations: ['scenario'],
    });
    if (!parcours) throw new NotFoundException(`Parcours #${id} introuvable`);
    return parcours;
  }

  async findByScenario(scenarioId: number): Promise<Parcours[]> {
    return this.parcoursRepo.find({
      where: { scenario: { id: scenarioId } },
    });
  }

  async create(dto: CreateParcoursDto): Promise<Parcours> {
    const parcours = this.parcoursRepo.create({
      ...dto,
      scenario: { id: dto.scenarioId },
    });
    return this.parcoursRepo.save(parcours);
  }

  async update(id: number, dto: UpdateParcoursDto): Promise<Parcours> {
    await this.parcoursRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const parcours = await this.findOne(id);
    await this.parcoursRepo.remove(parcours);
  }
}
