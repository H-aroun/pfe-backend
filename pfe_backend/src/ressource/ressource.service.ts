import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ressource } from './ressource.entity';
import { CreateRessourceDto, UpdateRessourceDto } from './dto/ressource.dto';

@Injectable()
export class RessourceService {
  constructor(
    @InjectRepository(Ressource)
    private readonly ressourceRepo: Repository<Ressource>,
  ) {}

  async findAll(): Promise<Ressource[]> {
    return this.ressourceRepo.find({ relations: ['scenario', 'module'] });
  }

  async findOne(id: number): Promise<Ressource> {
    const ressource = await this.ressourceRepo.findOne({
      where: { id },
      relations: ['scenario', 'module'],
    });
    if (!ressource) throw new NotFoundException(`Ressource #${id} introuvable`);
    return ressource;
  }

  async findByScenario(scenarioId: number): Promise<Ressource[]> {
    return this.ressourceRepo.find({
      where: { scenario: { id: scenarioId } },
    });
  }

  async findByModule(moduleId: number): Promise<Ressource[]> {
    return this.ressourceRepo.find({
      where: { module: { id: moduleId } },
    });
  }

  async create(dto: CreateRessourceDto): Promise<Ressource> {
    const ressource = this.ressourceRepo.create({
      ...dto,
      scenario: dto.scenarioId ? { id: dto.scenarioId } : undefined,
      module: dto.moduleId ? { id: dto.moduleId } : undefined,
    });
    return this.ressourceRepo.save(ressource);
  }

  async update(id: number, dto: UpdateRessourceDto): Promise<Ressource> {
    await this.ressourceRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const ressource = await this.findOne(id);
    await this.ressourceRepo.remove(ressource);
  }
}
