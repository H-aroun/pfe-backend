import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ScormService } from './scorm.service';

@ApiTags('scorm')
@UseGuards(AuthGuard)
@ApiBearerAuth('access-token')
@Controller('scorm')
export class ScormController {
  constructor(private readonly scormService: ScormService) {}

  /**
   * GET /scenarios/:id/export/scorm
   * Returns a SCORM 1.2 zip package for the given scenario.
   */
  @Get(':id/export/scorm')
  @ApiOperation({
    summary: 'Exporter un scénario en package SCORM 1.2 (.zip)',
  })
  async exportScorm(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.scormService.generateScormPackage(id);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="scenario_${id}_scorm.zip"`,
      'Content-Length': buffer.length.toString(),
    });

    res.end(buffer);
  }
}
