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
import { ParcoursService } from './parcours.service';
import { CreateParcoursDto, UpdateParcoursDto } from './dto/parcours.dto';

@ApiTags('parcours')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('parcours')
export class ParcoursController {
  constructor(private readonly parcoursService: ParcoursService) {}

  @Get()
  findAll() {
    return this.parcoursService.findAll();
  }

  @Get('scenario/:scenarioId')
  findByScenario(@Param('scenarioId', ParseIntPipe) scenarioId: number) {
    return this.parcoursService.findByScenario(scenarioId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parcoursService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateParcoursDto) {
    return this.parcoursService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateParcoursDto,
  ) {
    return this.parcoursService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parcoursService.remove(id);
  }
}
