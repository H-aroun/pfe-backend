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
import { ActiviteService } from './activite.service';
import { CreateActiviteDto, UpdateActiviteDto } from './dto/activite.dto';

@ApiTags('activites')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('activites')
export class ActiviteController {
  constructor(private readonly activiteService: ActiviteService) {}

  @Get()
  findAll() {
    return this.activiteService.findAll();
  }

  @Get('sequence/:sequenceId')
  findBySequence(@Param('sequenceId', ParseIntPipe) sequenceId: number) {
    return this.activiteService.findBySequence(sequenceId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.activiteService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateActiviteDto) {
    return this.activiteService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActiviteDto,
  ) {
    return this.activiteService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activiteService.remove(id);
  }
}
