import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseModule } from './course-module.entity';
import {
  CreateCourseModuleDto,
  UpdateCourseModuleDto,
} from './dto/course-module.dto';

@Injectable()
export class CourseModuleService {
  constructor(
    @InjectRepository(CourseModule)
    private readonly moduleRepo: Repository<CourseModule>,
  ) {}

  async findAll(): Promise<CourseModule[]> {
    return this.moduleRepo.find({
      relations: ['scenario', 'sequences', 'ressources'],
    });
  }

  async findOne(id: number): Promise<CourseModule> {
    const module = await this.moduleRepo.findOne({
      where: { id },
      relations: ['scenario', 'sequences', 'sequences.activites', 'ressources'],
    });
    if (!module) throw new NotFoundException(`Module #${id} introuvable`);
    return module;
  }

  async findByScenario(scenarioId: number): Promise<CourseModule[]> {
    return this.moduleRepo.find({
      where: { scenario: { id: scenarioId } },
      order: { ordre: 'ASC' },
      relations: ['sequences'],
    });
  }

  async create(dto: CreateCourseModuleDto): Promise<CourseModule> {
    const module = this.moduleRepo.create({
      ...dto,
      scenario: { id: dto.scenarioId },
    });
    return this.moduleRepo.save(module);
  }

  async update(id: number, dto: UpdateCourseModuleDto): Promise<CourseModule> {
    await this.moduleRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const module = await this.findOne(id);
    await this.moduleRepo.remove(module);
  }
}
