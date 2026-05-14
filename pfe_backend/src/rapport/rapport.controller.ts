import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { RapportService } from './rapport.service';
import { CreateRapportDto, UpdateRapportDto } from './dto/rapport.dto';

@ApiTags('rapports')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('rapports')
export class RapportController {
  constructor(private readonly rapportService: RapportService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: '(Admin) Lister tous les rapports' })
  findAll() {
    return this.rapportService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes rapports (utilisateur connecté)' })
  findMine(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.rapportService.findByUser(req.decodedData.id as number);
  }

  @Get('scenario/:scenarioId')
  @ApiOperation({ summary: 'Rapports liés à un scénario' })
  findByScenario(@Param('scenarioId', ParseIntPipe) scenarioId: number) {
    return this.rapportService.findByScenario(scenarioId);
  }

  // ─── Analytics (MUST come before :id) ───────────────────────────────────

  @Get('analytics/global')
  @Roles('admin')
  @ApiOperation({
    summary:
      '(Admin) Statistiques globales : totaux, scores moyens, répartition par statut et type',
  })
  getGlobalStats() {
    return this.rapportService.getGlobalStats();
  }

  @Get('analytics/dashboard')
  @Roles('admin')
  @ApiOperation({
    summary:
      '(Admin) Tableau de bord complet : stats globales + top scénarios + rapports récents',
  })
  getAdminDashboard() {
    return this.rapportService.getAdminDashboard();
  }

  @Get('analytics/scenario/:scenarioId')
  @ApiOperation({
    summary:
      "Statistiques d'un scénario : nombre de rapports, score min/max/moyen, répartition par type",
  })
  getScenarioStats(@Param('scenarioId', ParseIntPipe) scenarioId: number) {
    return this.rapportService.getScenarioStats(scenarioId);
  }

  @Get('analytics/user/:userId')
  @ApiOperation({
    summary:
      "Statistiques d'un utilisateur : activité, score moyen, date dernière activité",
  })
  getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.rapportService.getUserStats(userId);
  }

  @Get('analytics/me')
  @ApiOperation({ summary: 'Mes propres statistiques (utilisateur connecté)' })
  getMyStats(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.rapportService.getUserStats(req.decodedData.id as number);
  }

  // ─── CRUD Continued ──────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un rapport" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rapportService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un rapport' })
  create(@Body() dto: CreateRapportDto) {
    return this.rapportService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un rapport' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRapportDto) {
    return this.rapportService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un rapport' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rapportService.remove(id);
  }
}
