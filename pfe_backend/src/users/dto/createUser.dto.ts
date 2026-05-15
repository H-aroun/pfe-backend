import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEmail, IsString } from 'class-validator';

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
  dateInscription!: string;

  @ApiProperty({ example: 1 })
  roleId!: number;
}
