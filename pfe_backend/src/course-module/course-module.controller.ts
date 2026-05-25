import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { CourseModuleService } from './course-module.service';
import {
  CreateCourseModuleDto,
  UpdateCourseModuleDto,
} from './dto/course-module.dto';
import { ReorderItemsDto } from 'src/common/dto/reorder.dto';

@ApiTags('modules')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('modules')
export class CourseModuleController {
  constructor(private readonly moduleService: CourseModuleService) {}

  @Get()
  findAll() {
    return this.moduleService.findAll();
  }

  @Get('scenario/:scenarioId')
  findByScenario(@Param('scenarioId', ParseIntPipe) scenarioId: number) {
    return this.moduleService.findByScenario(scenarioId);
  }

  @Patch('scenario/:scenarioId/reorder')
  reorderByScenario(
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Body() dto: ReorderItemsDto,
  ) {
    return this.moduleService.reorderByScenario(scenarioId, dto.items);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCourseModuleDto) {
    return this.moduleService.create(dto);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCourseModuleDto,
  ) {
    return this.moduleService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.moduleService.remove(id);
  }
}
