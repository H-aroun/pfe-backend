import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateParcoursDto {
  @ApiProperty({ example: 'Parcours TypeScript Débutant' })
  @IsString()
  @IsNotEmpty()
  titre: string;

  @ApiPropertyOptional({ example: "Parcours d'introduction" })
  @IsString()
  @IsOptional()
  texte?: string;

  @ApiPropertyOptional({ example: 'Description détaillée du parcours.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @IsOptional()
  dureeEstimee?: number;

  @ApiProperty({ example: 1, description: 'ID du scénario parent' })
  @IsNumber()
  scenarioId: number;
}

export class UpdateParcoursDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  titre?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  texte?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  dureeEstimee?: number;
}
