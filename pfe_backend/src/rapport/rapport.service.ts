import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rapport } from './rapport.entity';
import { CreateRapportDto, UpdateRapportDto } from './dto/rapport.dto';
import { Scenario } from 'src/scenario/scenario.entity';
import { User } from 'src/users/user.entity';
import { StatutScenario, TypeRapport } from 'src/common/enums';

// ── Typed response shapes ────────────────────────────────────────────────────

export interface GlobalStatsDto {
  totalRapports: number;
  totalScenarios: number;
  totalUsers: number;
  averageScore: number | null;
  scenariosByStatus: Record<string, number>;
  rapportsByType: Record<string, number>;
}

export interface ScenarioStatsDto {
  scenarioId: number;
  scenarioTitre: string;
  totalRapports: number;
  averageScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  rapportsByType: Record<string, number>;
}

export interface UserStatsDto {
  userId: number;
  userName: string;
  totalRapports: number;
  averageScore: number | null;
  lastActivity: Date | null;
  rapportsByType: Record<string, number>;
  scenariosInvolved: number;
}

export interface AdminDashboardDto {
  global: GlobalStatsDto;
  topScenarios: ScenarioStatsDto[];
  recentRapports: Rapport[];
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RapportService {
  constructor(
    @InjectRepository(Rapport)
    private readonly rapportRepo: Repository<Rapport>,
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  // ─── Basic CRUD ─────────────────────────────────────────────────────────

  async findAll(): Promise<Rapport[]> {
    return this.rapportRepo.find({ relations: ['user', 'scenario'] });
  }

  async findOne(id: number): Promise<Rapport> {
    const rapport = await this.rapportRepo.findOne({
      where: { id },
      relations: ['user', 'scenario'],
    });
    if (!rapport) throw new NotFoundException(`Rapport #${id} introuvable`);
    return rapport;
  }

  async findByUser(userId: number): Promise<Rapport[]> {
    return this.rapportRepo.find({
      where: { user: { id: userId } },
      relations: ['scenario'],
      order: { date: 'DESC' },
    });
  }

  async findByScenario(scenarioId: number): Promise<Rapport[]> {
    return this.rapportRepo.find({
      where: { scenario: { id: scenarioId } },
      relations: ['user'],
      order: { date: 'DESC' },
    });
  }

  async create(dto: CreateRapportDto): Promise<Rapport> {
    const rapport = this.rapportRepo.create({
      ...dto,
      user: { id: dto.userId },
      scenario: dto.scenarioId ? { id: dto.scenarioId } : undefined,
    });
    return this.rapportRepo.save(rapport);
  }

  async update(id: number, dto: UpdateRapportDto): Promise<Rapport> {
    await this.rapportRepo.update(id, dto as any);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const rapport = await this.findOne(id);
    await this.rapportRepo.remove(rapport);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────

  /**
   * Platform-wide statistics (admin view).
   * Returns totals, averages, and breakdowns by status and type.
   */
  async getGlobalStats(): Promise<GlobalStatsDto> {
    const [rapports, scenarios, users] = await Promise.all([
      this.rapportRepo.find({ relations: ['scenario'] }),
      this.scenarioRepo.find(),
      this.userRepo.find(),
    ]);

    // Average score across all rapports that have a score
    const withScore = rapports.filter(
      (r) => r.score !== null && r.score !== undefined,
    );
    const averageScore =
      withScore.length > 0
        ? Math.round(
            (withScore.reduce((s, r) => s + r.score, 0) / withScore.length) *
              100,
          ) / 100
        : null;

    // Scenario count by status
    const scenariosByStatus = Object.values(StatutScenario).reduce(
      (acc, status) => {
        acc[status] = scenarios.filter((s) => s.statut === status).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Rapport count by type
    const rapportsByType = Object.values(TypeRapport).reduce(
      (acc, type) => {
        acc[type] = rapports.filter((r) => r.type === type).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalRapports: rapports.length,
      totalScenarios: scenarios.length,
      totalUsers: users.length,
      averageScore,
      scenariosByStatus,
      rapportsByType,
    };
  }

  /**
   * Per-scenario statistics: score distribution, rapport type breakdown.
   */
  async getScenarioStats(scenarioId: number): Promise<ScenarioStatsDto> {
    const scenario = await this.scenarioRepo.findOne({
      where: { id: scenarioId },
    });
    if (!scenario)
      throw new NotFoundException(`Scénario #${scenarioId} introuvable`);

    const rapports = await this.rapportRepo.find({
      where: { scenario: { id: scenarioId } },
    });

    const withScore = rapports.filter(
      (r) => r.score !== null && r.score !== undefined,
    );
    const scores = withScore.map((r) => r.score);

    const rapportsByType = Object.values(TypeRapport).reduce(
      (acc, type) => {
        acc[type] = rapports.filter((r) => r.type === type).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      scenarioId,
      scenarioTitre: scenario.titre,
      totalRapports: rapports.length,
      averageScore:
        scores.length > 0
          ? Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
            ) / 100
          : null,
      minScore: scores.length > 0 ? Math.min(...scores) : null,
      maxScore: scores.length > 0 ? Math.max(...scores) : null,
      rapportsByType,
    };
  }

  /**
   * Per-user statistics: activity count, score average, last activity date.
   */
  async getUserStats(userId: number): Promise<UserStatsDto> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user)
      throw new NotFoundException(`Utilisateur #${userId} introuvable`);

    const rapports = await this.rapportRepo.find({
      where: { user: { id: userId } },
      relations: ['scenario'],
      order: { date: 'DESC' },
    });

    const withScore = rapports.filter(
      (r) => r.score !== null && r.score !== undefined,
    );
    const scores = withScore.map((r) => r.score);

    const scenariosInvolved = new Set(
      rapports.filter((r) => r.scenario).map((r) => r.scenario.id),
    ).size;

    const rapportsByType = Object.values(TypeRapport).reduce(
      (acc, type) => {
        acc[type] = rapports.filter((r) => r.type === type).length;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      userId,
      userName: user.firstName + user.lastName,
      totalRapports: rapports.length,
      averageScore:
        scores.length > 0
          ? Math.round(
              (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
            ) / 100
          : null,
      lastActivity: rapports.length > 0 ? rapports[0].date : null,
      rapportsByType,
      scenariosInvolved,
    };
  }

  /**
   * Full admin dashboard: global stats + top 5 scenarios + last 10 rapports.
   */
  async getAdminDashboard(): Promise<AdminDashboardDto> {
    const [global, recentRapports, allScenarios] = await Promise.all([
      this.getGlobalStats(),
      this.rapportRepo.find({
        relations: ['user', 'scenario'],
        order: { date: 'DESC' },
        take: 10,
      }),
      this.scenarioRepo.find(),
    ]);

    // Calculate top 5 scenarios using already fetched data or optimized query
    // Since we need full stats for each, we'll get the IDs first
    const scenarioIdCounts: Record<number, number> = {};
    const allRapportsWithScenario = await this.rapportRepo.find({
      select: ['id', 'scenario'],
      relations: ['scenario'],
    });

    allRapportsWithScenario.forEach((r) => {
      if (r.scenario) {
        scenarioIdCounts[r.scenario.id] =
          (scenarioIdCounts[r.scenario.id] ?? 0) + 1;
      }
    });

    const topIds = Object.entries(scenarioIdCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => Number(id));

    const topScenarios = await Promise.all(
      topIds
        .filter((id) => allScenarios.some((s) => s.id === id))
        .map((id) => this.getScenarioStats(id)),
    );

    return { global, topScenarios, recentRapports };
  }
}
