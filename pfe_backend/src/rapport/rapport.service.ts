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

export interface ActivityPointDto {
  date: string;
  count: number;
  completions: number;
}

export interface ScenarioDashboardStatDto {
  id: string;
  title: string;
  attempts: number;
  completions: number;
  completionRate: number;
  avgScore: number;
  avgTime: number | null;
  status: StatutScenario;
  successRate: number;
}

export interface RapportSummaryDto {
  id: string;
  type: TypeRapport;
  date: string;
  score: number | null;
  scenarioId: string | null;
  scenarioTitle: string | null;
  userId: string;
  userName: string;
}

export interface ScenarioStatsDto {
  scenarioId: number;
  title: string;
  scenarioTitre: string;
  totalAttempts: number;
  totalRapports: number;
  completions: number;
  completionRate: number;
  averageScore: number | null;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  avgDuration: number | null;
  status: StatutScenario;
  successRate: number;
  activityBreakdown: ActivityStatDto[];
  rapportsByType: Record<string, number>;
}

export interface ActivityStatDto {
  activityId: string;
  title: string;
  attempts: number;
  successRate: number;
  avgScore: number;
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

export interface AnalyticsDashboardDto extends GlobalStatsDto {
  global: GlobalStatsDto;
  totalAttempts: number;
  avgScore: number;
  avgCompletionRate: number;
  publishedScenarios: number;
  draftScenarios: number;
  archivedScenarios: number;
  recentActivity: ActivityPointDto[];
  topScenarios: ScenarioDashboardStatDto[];
  recentRapports: RapportSummaryDto[];
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
    const rapport = await this.findOne(id);
    Object.assign(rapport, dto);
    return this.rapportRepo.save(rapport);
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

    const completions = this.countCompletions(rapports);
    const completionRate = this.percentage(completions, rapports.length);
    const averageScore =
      scores.length > 0
        ? Math.round(
            (scores.reduce((a, b) => a + b, 0) / scores.length) * 100,
          ) / 100
        : null;

    return {
      scenarioId,
      title: scenario.titre,
      scenarioTitre: scenario.titre,
      totalAttempts: rapports.length,
      totalRapports: rapports.length,
      completions,
      completionRate,
      averageScore,
      avgScore: averageScore,
      minScore: scores.length > 0 ? Math.min(...scores) : null,
      maxScore: scores.length > 0 ? Math.max(...scores) : null,
      avgDuration: this.averageDuration(rapports),
      status: scenario.statut,
      successRate: this.successRate(rapports),
      activityBreakdown: this.activityBreakdown(rapports),
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
  async getAdminDashboard(): Promise<AnalyticsDashboardDto> {
    const [global, recentRapports, allScenarios, allRapports] =
      await Promise.all([
        this.getGlobalStats(),
        this.rapportRepo.find({
          relations: ['user', 'scenario'],
          order: { date: 'DESC' },
          take: 10,
        }),
        this.scenarioRepo.find(),
        this.rapportRepo.find({ relations: ['scenario', 'user'] }),
      ]);

    const reportsByScenario = this.groupRapportsByScenario(allRapports);
    const topScenarios = allScenarios
      .map((scenario) =>
        this.toScenarioDashboardStat(
          scenario,
          reportsByScenario.get(scenario.id) ?? [],
        ),
      )
      .sort((a, b) => b.attempts - a.attempts || b.avgScore - a.avgScore)
      .slice(0, 5)
      .filter((scenario) => scenario.attempts > 0 || allScenarios.length <= 5);

    return {
      ...global,
      global,
      totalAttempts: global.totalRapports,
      avgScore: global.averageScore ?? 0,
      avgCompletionRate: this.averageCompletionRate(allRapports),
      publishedScenarios:
        (global.scenariosByStatus[StatutScenario.APPROUVE] ?? 0) +
        (global.scenariosByStatus[StatutScenario.EXPORTE] ?? 0),
      draftScenarios: global.scenariosByStatus[StatutScenario.BROUILLON] ?? 0,
      archivedScenarios: global.scenariosByStatus[StatutScenario.ARCHIVE] ?? 0,
      recentActivity: this.buildRecentActivity(allRapports),
      topScenarios,
      recentRapports: recentRapports.map((rapport) =>
        this.toRapportSummary(rapport),
      ),
    };
  }

  private scoreValue(rapport: Rapport): number | null {
    return typeof rapport.score === 'number' && Number.isFinite(rapport.score)
      ? rapport.score
      : null;
  }

  private averageScore(rapports: Rapport[]): number {
    const scores = rapports
      .map((rapport) => this.scoreValue(rapport))
      .filter((score): score is number => score !== null);

    if (!scores.length) return 0;
    return (
      Math.round(
        (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 100,
      ) / 100
    );
  }

  private countCompletions(rapports: Rapport[]): number {
    return rapports.filter((rapport) => this.isCompletion(rapport)).length;
  }

  private isCompletion(rapport: Rapport): boolean {
    const data = rapport.donnees ?? {};
    const completed = data.completed ?? data.complete ?? data.isComplete;
    const completionRate = data.completionRate ?? data.progress ?? data.pct;

    if (completed === true) return true;
    if (typeof completionRate === 'number') return completionRate >= 100;
    if (rapport.type === TypeRapport.PROGRESSION) return true;
    return false;
  }

  private percentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 10000) / 100 : 0;
  }

  private averageCompletionRate(rapports: Rapport[]): number {
    return this.percentage(this.countCompletions(rapports), rapports.length);
  }

  private successRate(rapports: Rapport[]): number {
    const scoreReports = rapports.filter(
      (rapport) => this.scoreValue(rapport) !== null,
    );
    const passed = scoreReports.filter(
      (rapport) => (this.scoreValue(rapport) ?? 0) >= 70,
    ).length;

    return this.percentage(passed, scoreReports.length);
  }

  private averageDuration(rapports: Rapport[]): number | null {
    const durations = rapports
      .map((rapport) => {
        const duration =
          rapport.donnees?.duration ??
          rapport.donnees?.durationMinutes ??
          rapport.donnees?.timeSpent;
        return typeof duration === 'number' && Number.isFinite(duration)
          ? duration
          : null;
      })
      .filter((duration): duration is number => duration !== null);

    if (!durations.length) return null;
    return (
      Math.round(
        (durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length) *
          100,
      ) / 100
    );
  }

  private activityBreakdown(rapports: Rapport[]): ActivityStatDto[] {
    const byActivity = new Map<string, Rapport[]>();

    rapports.forEach((rapport) => {
      const data = rapport.donnees ?? {};
      const rawActivityId = data.activityId ?? data.activiteId;
      const activityId =
        typeof rawActivityId === 'number' || typeof rawActivityId === 'string'
          ? String(rawActivityId)
          : 'scenario';
      const current = byActivity.get(activityId) ?? [];
      current.push(rapport);
      byActivity.set(activityId, current);
    });

    return Array.from(byActivity.entries()).map(
      ([activityId, activityReports]) => {
        const titleSource = activityReports.find((rapport) => {
          const title =
            rapport.donnees?.activityTitle ?? rapport.donnees?.title;
          return typeof title === 'string' && title.length > 0;
        });
        const title =
          typeof titleSource?.donnees?.activityTitle === 'string'
            ? titleSource.donnees.activityTitle
            : typeof titleSource?.donnees?.title === 'string'
              ? titleSource.donnees.title
              : activityId === 'scenario'
                ? 'Scenario'
                : `Activity ${activityId}`;

        return {
          activityId,
          title,
          attempts: activityReports.length,
          successRate: this.successRate(activityReports),
          avgScore: this.averageScore(activityReports),
        };
      },
    );
  }

  private groupRapportsByScenario(rapports: Rapport[]): Map<number, Rapport[]> {
    const grouped = new Map<number, Rapport[]>();

    rapports.forEach((rapport) => {
      if (!rapport.scenario) return;
      const current = grouped.get(rapport.scenario.id) ?? [];
      current.push(rapport);
      grouped.set(rapport.scenario.id, current);
    });

    return grouped;
  }

  private toScenarioDashboardStat(
    scenario: Scenario,
    rapports: Rapport[],
  ): ScenarioDashboardStatDto {
    const completions = this.countCompletions(rapports);

    return {
      id: String(scenario.id),
      title: scenario.titre,
      attempts: rapports.length,
      completions,
      completionRate: this.percentage(completions, rapports.length),
      avgScore: this.averageScore(rapports),
      avgTime: this.averageDuration(rapports),
      status: scenario.statut,
      successRate: this.successRate(rapports),
    };
  }

  private buildRecentActivity(rapports: Rapport[]): ActivityPointDto[] {
    const today = new Date();
    const days = Array.from({ length: 30 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (29 - index));
      return date.toISOString().slice(0, 10);
    });
    const grouped = new Map<string, { count: number; completions: number }>();

    days.forEach((day) => grouped.set(day, { count: 0, completions: 0 }));
    rapports.forEach((rapport) => {
      const day = rapport.date.toISOString().slice(0, 10);
      if (!grouped.has(day)) return;
      const point = grouped.get(day);
      if (!point) return;
      point.count += 1;
      if (this.isCompletion(rapport)) point.completions += 1;
    });

    return days.map((day) => ({
      date: day,
      count: grouped.get(day)?.count ?? 0,
      completions: grouped.get(day)?.completions ?? 0,
    }));
  }

  private toRapportSummary(rapport: Rapport): RapportSummaryDto {
    return {
      id: String(rapport.id),
      type: rapport.type,
      date: rapport.date.toISOString(),
      score: this.scoreValue(rapport),
      scenarioId: rapport.scenario ? String(rapport.scenario.id) : null,
      scenarioTitle: rapport.scenario?.titre ?? null,
      userId: String(rapport.user.id),
      userName: `${rapport.user.firstName} ${rapport.user.lastName}`.trim(),
    };
  }
}
