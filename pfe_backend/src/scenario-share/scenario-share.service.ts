import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from 'src/scenario/scenario.entity';
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
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
  ) {}

  /** List all shares for a given scenario */
  async findByScenario(
    scenarioId: number,
    requesterId?: number,
    requesterRole?: string,
  ): Promise<ScenarioShare[]> {
    if (requesterId) {
      await this.assertCanViewScenario(scenarioId, requesterId, requesterRole);
    }

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

  async share(
    dto: CreateScenarioShareDto,
    requesterId?: number,
    requesterRole?: string,
  ): Promise<ScenarioShare> {
    if (requesterId) {
      await this.assertCanEditScenario(
        dto.scenarioId,
        requesterId,
        requesterRole,
      );
    }

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
    requesterId?: number,
    requesterRole?: string,
  ): Promise<ScenarioShare> {
    const share = await this.shareRepo.findOne({
      where: { id },
      relations: ['scenario'],
    });
    if (!share) throw new NotFoundException(`Partage #${id} introuvable`);
    if (requesterId) {
      await this.assertCanEditScenario(
        share.scenario.id,
        requesterId,
        requesterRole,
      );
    }

    share.permission = dto.permission;
    return this.shareRepo.save(share);
  }

  async revoke(
    id: number,
    requesterId?: number,
    requesterRole?: string,
  ): Promise<void> {
    const share = await this.shareRepo.findOne({
      where: { id },
      relations: ['scenario'],
    });
    if (!share) throw new NotFoundException(`Partage #${id} introuvable`);
    if (requesterId) {
      await this.assertCanEditScenario(
        share.scenario.id,
        requesterId,
        requesterRole,
      );
    }

    await this.shareRepo.remove(share);
  }

  private async assertCanViewScenario(
    scenarioId: number,
    userId: number,
    userRole?: string,
  ): Promise<void> {
    if (userRole?.toLowerCase() === 'admin') return;

    const ownedScenario = await this.scenarioRepo.findOne({
      where: { id: scenarioId, user: { id: userId } },
      relations: ['user'],
    });
    if (ownedScenario) return;

    const share = await this.shareRepo.findOne({
      where: { scenario: { id: scenarioId }, sharedWith: { id: userId } },
      relations: ['scenario', 'sharedWith'],
    });

    if (!share) {
      throw new ForbiddenException('Vous n’avez pas acces a ce scenario.');
    }
  }

  private async assertCanEditScenario(
    scenarioId: number,
    userId: number,
    userRole?: string,
  ): Promise<void> {
    if (userRole?.toLowerCase() === 'admin') return;

    const ownedScenario = await this.scenarioRepo.findOne({
      where: { id: scenarioId, user: { id: userId } },
      relations: ['user'],
    });

    if (ownedScenario) return;

    const editableShare = await this.shareRepo.findOne({
      where: {
        scenario: { id: scenarioId },
        sharedWith: { id: userId },
        permission: 'edit',
      },
      relations: ['scenario', 'sharedWith'],
    });

    if (!editableShare) {
      throw new ForbiddenException(
        'Vous devez avoir le droit de modification pour partager ce scenario.',
      );
    }
  }
}
