import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateScenarioShareDto {
  @ApiProperty({ example: 1, description: 'ID du scénario à partager' })
  @IsNumber()
  scenarioId: number;

  @ApiProperty({ example: 2, description: "ID de l'enseignant destinataire" })
  @IsNumber()
  sharedWithId: number;

  @ApiPropertyOptional({
    enum: ['view', 'edit'],
    default: 'view',
    description: 'Permission accordée',
  })
  @IsEnum(['view', 'edit'])
  @IsOptional()
  permission?: 'view' | 'edit';
}

export class UpdateScenarioShareDto {
  @ApiProperty({ enum: ['view', 'edit'] })
  @IsEnum(['view', 'edit'])
  @IsNotEmpty()
  permission: 'view' | 'edit';
}
