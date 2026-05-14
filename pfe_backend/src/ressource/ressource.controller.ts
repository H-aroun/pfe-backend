import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { RessourceService } from './ressource.service';
import { CreateRessourceDto, UpdateRessourceDto } from './dto/ressource.dto';

@ApiTags('ressources')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('ressources')
export class RessourceController {
  constructor(private readonly ressourceService: RessourceService) {}

  @Get()
  findAll() {
    return this.ressourceService.findAll();
  }

  @Get('scenario/:scenarioId')
  findByScenario(@Param('scenarioId', ParseIntPipe) scenarioId: number) {
    return this.ressourceService.findByScenario(scenarioId);
  }

  @Get('module/:moduleId')
  findByModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.ressourceService.findByModule(moduleId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ressourceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRessourceDto) {
    return this.ressourceService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRessourceDto,
  ) {
    return this.ressourceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ressourceService.remove(id);
  }
}
