import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScenarioShare } from './scenario-share.entity';
import {
  CreateScenarioShareDto,
  UpdateScenarioShareDto,
} from './dto/scenario-share.dto';

@Injectable()
export class ScenarioShareService {
  constructor(
    @InjectRepository(ScenarioShare)
    private readonly shareRepo: Repository<ScenarioShare>,
  ) {}

  /** List all shares for a given scenario */
  async findByScenario(scenarioId: number): Promise<ScenarioShare[]> {
    return this.shareRepo.find({
      where: { scenario: { id: scenarioId } },
      relations: ['sharedWith'],
    });
  }

  /** List all scenarios shared with a user */
  async findByUser(userId: number): Promise<ScenarioShare[]> {
    return this.shareRepo.find({
      where: { sharedWith: { id: userId } },
      relations: ['scenario', 'scenario.user'],
    });
  }

  async share(dto: CreateScenarioShareDto): Promise<ScenarioShare> {
    // Prevent duplicate shares
    const existing = await this.shareRepo.findOne({
      where: {
        scenario: { id: dto.scenarioId },
        sharedWith: { id: dto.sharedWithId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ce scénario est déjà partagé avec cet utilisateur.',
      );
    }
    const share = this.shareRepo.create({
      permission: dto.permission ?? 'view',
      scenario: { id: dto.scenarioId },
      sharedWith: { id: dto.sharedWithId },
    });
    return this.shareRepo.save(share);
  }

  async updatePermission(
    id: number,
    dto: UpdateScenarioShareDto,
  ): Promise<ScenarioShare> {
    const share = await this.shareRepo.findOne({ where: { id } });
    if (!share) throw new NotFoundException(`Partage #${id} introuvable`);
    share.permission = dto.permission;
    return this.shareRepo.save(share);
  }

  async revoke(id: number): Promise<void> {
    const share = await this.shareRepo.findOne({ where: { id } });
    if (!share) throw new NotFoundException(`Partage #${id} introuvable`);
    await this.shareRepo.remove(share);
  }
}
