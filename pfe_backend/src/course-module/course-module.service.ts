import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CourseModule } from './course-module.entity';
import {
  CreateCourseModuleDto,
  UpdateCourseModuleDto,
} from './dto/course-module.dto';
import { ReorderItemDto } from 'src/common/dto/reorder.dto';

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
    const ordre =
      dto.ordre ??
      (await this.moduleRepo.count({
        where: { scenario: { id: dto.scenarioId } },
      }));
    const module = this.moduleRepo.create({
      ...dto,
      ordre,
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

  async reorderByScenario(
    scenarioId: number,
    items: ReorderItemDto[],
  ): Promise<CourseModule[]> {
    if (!items.length) return this.findByScenario(scenarioId);

    const ids = items.map((item) => item.id);
    const modules = await this.moduleRepo.find({
      where: { id: In(ids), scenario: { id: scenarioId } },
      relations: ['scenario'],
    });

    if (modules.length !== ids.length) {
      throw new NotFoundException(
        'Un ou plusieurs modules sont introuvables dans ce scénario',
      );
    }

    await this.moduleRepo.manager.transaction(async (manager) => {
      await Promise.all(
        items.map((item) =>
          manager.update(CourseModule, item.id, { ordre: item.ordre }),
        ),
      );
    });

    return this.findByScenario(scenarioId);
  }
}
