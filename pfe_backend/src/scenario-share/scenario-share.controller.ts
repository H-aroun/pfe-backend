import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { RoleGuard } from 'src/role/role.guard';
import { ScenarioShareService } from './scenario-share.service';
import {
  CreateScenarioShareDto,
  UpdateScenarioShareDto,
} from './dto/scenario-share.dto';

@ApiTags('scenario-shares')
@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('scenario-shares')
export class ScenarioShareController {
  constructor(private readonly shareService: ScenarioShareService) {}

  @Get('my')
  @ApiOperation({ summary: 'Scénarios partagés avec moi' })
  sharedWithMe(@Request() req: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return this.shareService.findByUser(req.decodedData.id as number);
  }

  @Get('scenario/:scenarioId')
  @ApiOperation({ summary: "Lister les partages d'un scénario" })
  findByScenario(
    @Param('scenarioId', ParseIntPipe) scenarioId: number,
    @Request() req: any,
  ) {
    return this.shareService.findByScenario(
      scenarioId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.id as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.role as string,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Partager un scénario avec un enseignant' })
  share(@Body() dto: CreateScenarioShareDto, @Request() req: any) {
    return this.shareService.share(
      dto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.id as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.role as string,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: "Modifier la permission d'un partage" })
  updatePermission(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScenarioShareDto,
    @Request() req: any,
  ) {
    return this.shareService.updatePermission(
      id,
      dto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.id as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.role as string,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Révoquer un partage' })
  revoke(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.shareService.revoke(
      id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.id as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.decodedData.role as string,
    );
  }
}
