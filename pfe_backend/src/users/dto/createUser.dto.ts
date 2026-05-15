import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsObject, IsString } from 'class-validator';
import { Role } from 'src/role/role.entity';

export class CreateUserDTO {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName!: string;
  @ApiProperty({ example: 'DOE' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: new Date() })
  @IsDate()
  @Type(() => Date)
  dateInscription!: string;

  @IsObject()
  @Type(() => Role)
  role: Role;
}
