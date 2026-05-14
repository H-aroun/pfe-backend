import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsObject, IsOptional } from 'class-validator';
import { TypeRapport } from 'src/common/enums';

export class CreateRapportDto {
  @ApiProperty({ enum: TypeRapport, example: TypeRapport.EVALUATION })
  @IsEnum(TypeRapport)
  type: TypeRapport;

  @ApiPropertyOptional({ example: { completed: 5, total: 10 } })
  @IsObject()
  @IsOptional()
  donnees?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 85.5 })
  @IsNumber()
  @IsOptional()
  score?: number;

  @ApiProperty({ example: 1, description: "ID de l'utilisateur" })
  @IsNumber()
  userId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID du scénario (optionnel)',
  })
  @IsNumber()
  @IsOptional()
  scenarioId?: number;
}

export class UpdateRapportDto {
  @ApiPropertyOptional({ enum: TypeRapport })
  @IsEnum(TypeRapport)
  @IsOptional()
  type?: TypeRapport;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  donnees?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  score?: number;
}
