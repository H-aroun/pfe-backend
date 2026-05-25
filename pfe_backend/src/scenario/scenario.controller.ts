/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { Roles } from 'src/role/role.decorator';
import { ScenarioService } from './scenario.service';
import { CreateScenarioDto, UpdateScenarioDto } from './dto/scenario.dto';
import { UpdateCourseDocumentDto } from './dto/course-document.dto';
import { UpdateScenarioDocumentDto } from './dto/scenario-document.dto';

@ApiTags('scenarios')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('scenarios')
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Lister tous les scénarios (admin uniquement)' })
  findAll() {
    return this.scenarioService.findAll();
  }

  @Get('my')
  @ApiOperation({ summary: 'Mes scénarios (enseignant connecté)' })
  findMine(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.scenarioService.findByUser(req.decodedData.id as number);
  }

  @Get(':id/course-document')
  @ApiOperation({ summary: "Document de cours structure d'un scenario" })
  async getCourseDocument(@Param('id', ParseIntPipe) id: number) {
    const scenario = await this.scenarioService.findOne(id);
    return scenario.courseDocument;
  }

  @Put(':id/course-document')
  @ApiOperation({ summary: 'Mettre a jour le document de cours structure' })
  async updateCourseDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseDocumentDto,
  ) {
    console.log("dto ", dto);
    
    if(!dto || !dto.courseDocument){
      throw new BadRequestException("bad requests")
    }    
    const scenario = await this.scenarioService.updateCourseDocument(
      id,
      dto.courseDocument,
    );
    return scenario.courseDocument;
  }

  @Get(':id/scenario-document')
  @ApiOperation({ summary: "Document graph de creation d'un scenario" })
  async getScenarioDocument(@Param('id', ParseIntPipe) id: number) {
    const scenario = await this.scenarioService.findOne(id);
    return scenario.scenarioDocument;
  }

  @Put(':id/scenario-document')
  @ApiOperation({ summary: 'Mettre a jour le document graph du scenario' })
  async updateScenarioDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScenarioDocumentDto,
  ) {
    const scenario = await this.scenarioService.updateScenarioDocument(
      id,
      dto.scenarioDocument,
    );
    return scenario.scenarioDocument;
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un scénario" })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau scénario' })
  create(@Body() dto: CreateScenarioDto, @Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.scenarioService.create(dto, req.decodedData.id as number);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un scénario (bloqué si soumis)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScenarioDto,
  ) {
    return this.scenarioService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un scénario' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.remove(id);
  }

  // ─── LIFECYCLE ───────────────────────────────────────────────────────────

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Soumettre pour validation → EN_COURS_VALIDATION' })
  submit(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.submitForValidation(id);
  }

  @Patch(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: '(Admin) Approuver → APPROUVE' })
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.approve(id);
  }

  @Patch(':id/reject')
  @Roles('admin')
  @ApiOperation({ summary: '(Admin) Rejeter → retour BROUILLON' })
  reject(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.reject(id);
  }

  @Patch(':id/export')
  @ApiOperation({ summary: 'Exporter → EXPORTE' })
  export(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.exportScenario(id);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'Archiver → ARCHIVE' })
  archive(@Param('id', ParseIntPipe) id: number) {
    return this.scenarioService.archive(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Dupliquer un scénario pour soi-même' })
  duplicate(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.scenarioService.duplicate(id, req.decodedData.id as number);
  }
}
