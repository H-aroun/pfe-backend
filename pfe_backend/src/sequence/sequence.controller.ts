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
import { SequenceService } from './sequence.service';
import { CreateSequenceDto, UpdateSequenceDto } from './dto/sequence.dto';

@ApiTags('sequences')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('sequences')
export class SequenceController {
  constructor(private readonly sequenceService: SequenceService) {}

  @Get()
  findAll() {
    return this.sequenceService.findAll();
  }

  @Get('module/:moduleId')
  findByModule(@Param('moduleId', ParseIntPipe) moduleId: number) {
    return this.sequenceService.findByModule(moduleId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sequenceService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateSequenceDto) {
    return this.sequenceService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSequenceDto,
  ) {
    return this.sequenceService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sequenceService.remove(id);
  }
}
