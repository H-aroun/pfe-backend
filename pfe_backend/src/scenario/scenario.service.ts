import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from './scenario.entity';
import { CreateScenarioDto, UpdateScenarioDto } from './dto/scenario.dto';
import { StatutScenario } from 'src/common/enums';

@Injectable()
export class ScenarioService {
  constructor(
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  async findAll(): Promise<Scenario[]> {
    return this.scenarioRepo.find({
      relations: ['user', 'modules', 'parcours', 'ressources'],
    });
  }

  async findOne(id: number): Promise<Scenario> {
    const scenario = await this.scenarioRepo.findOne({
      where: { id },
      relations: [
        'user',
        'modules',
        'modules.sequences',
        'parcours',
        'ressources',
        'rapports',
      ],
    });
    if (!scenario) throw new NotFoundException(`Scénario #${id} introuvable`);
    return scenario;
  }

  async findByUser(userId: number): Promise<Scenario[]> {
    return this.scenarioRepo.find({
      where: { user: { id: userId } },
      relations: ['modules', 'parcours'],
    });
  }

  async create(dto: CreateScenarioDto, userId: number): Promise<Scenario> {
    const scenario = this.scenarioRepo.create({
      ...dto,
      user: { id: userId },
    });
    return this.scenarioRepo.save(scenario);
  }

  async update(id: number, dto: UpdateScenarioDto): Promise<Scenario> {
    const scenario = await this.findOne(id);
    // Block edits once submitted for validation or beyond
    const lockedStatuses = [
      StatutScenario.EN_COURS_VALIDATION,
      StatutScenario.APPROUVE,
      StatutScenario.FINALISE,
      StatutScenario.EXPORTE,
    ];
    if (lockedStatuses.includes(scenario.statut)) {
      throw new BadRequestException(
        `Impossible de modifier un scénario au statut "${scenario.statut}". Rejetez-le d'abord.`,
      );
    }
    await this.scenarioRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const scenario = await this.findOne(id);
    await this.scenarioRepo.remove(scenario);
  }

  // ─── LIFECYCLE TRANSITIONS ───────────────────────────────────────────────

  /** BROUILLON → EN_COURS_VALIDATION */
  async submitForValidation(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.BROUILLON) {
      throw new BadRequestException(
        `Seul un scénario en brouillon peut être soumis pour validation. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, {
      statut: StatutScenario.EN_COURS_VALIDATION,
    });
    return this.findOne(id);
  }

  /** EN_COURS_VALIDATION → APPROUVE */
  async approve(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.EN_COURS_VALIDATION) {
      throw new BadRequestException(
        `Seul un scénario "en cours de validation" peut être approuvé. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.APPROUVE });
    return this.findOne(id);
  }

  /** EN_COURS_VALIDATION → BROUILLON (rejected) */
  async reject(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.EN_COURS_VALIDATION) {
      throw new BadRequestException(
        `Seul un scénario "en cours de validation" peut être rejeté. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.BROUILLON });
    return this.findOne(id);
  }

  /** APPROUVE → FINALISE */
  async finalize(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.APPROUVE) {
      throw new BadRequestException(
        `Seul un scénario approuvé peut être finalisé. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.FINALISE });
    return this.findOne(id);
  }

  /** FINALISE → EXPORTE */
  async exportScenario(id: number): Promise<Scenario> {
    const scenario = await this.findOne(id);
    if (scenario.statut !== StatutScenario.FINALISE) {
      throw new BadRequestException(
        `Seul un scénario finalisé peut être exporté. Statut actuel : "${scenario.statut}"`,
      );
    }
    await this.scenarioRepo.update(id, { statut: StatutScenario.EXPORTE });
    return this.findOne(id);
  }

  /** Any state → ARCHIVE */
  async archive(id: number): Promise<Scenario> {
    await this.findOne(id);
    await this.scenarioRepo.update(id, { statut: StatutScenario.ARCHIVE });
    return this.findOne(id);
  }

  /** Duplicate a scenario (clone) for another user */
  async duplicate(id: number, newUserId: number): Promise<Scenario> {
    const original = await this.findOne(id);
    const clone = this.scenarioRepo.create({
      titre: `${original.titre} (copie)`,
      description: original.description,
      objectif: original.objectif,
      niveau: original.niveau,
      dureeScenario: original.dureeScenario,
      statut: StatutScenario.BROUILLON,
      user: { id: newUserId },
    });
    return this.scenarioRepo.save(clone);
  }
}
