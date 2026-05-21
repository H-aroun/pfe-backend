/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.services';
import { User } from './user.entity';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoleGuard } from 'src/role/role.guard';
import { CreateUserDTO } from './dto/createUser.dto';
import * as bcrypt from 'bcrypt';
import { ChangePasswordDTO } from './dto/changePassword.dto';
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  async createUser(@Body() data: CreateUserDTO): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const payload = {
      ...data,
      password: hashedPassword,
    };
    const result = await this.userService.createUser(payload);
    return result;
  }
  @UseGuards(AuthGuard, RoleGuard)
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  // Get user by EMAIL
  @UseGuards(AuthGuard, RoleGuard)
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<User | null> {
    return this.userService.getUserByEmail(email);
  }

  // Get user by ID
  @UseGuards(AuthGuard, RoleGuard)
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User | null> {
    return this.userService.getUserById(id);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Patch('change-password')
  async changePassword(
    @Req() req: Request,
    @Body() data: ChangePasswordDTO,
  ): Promise<{message: string} | undefined> {
    const email = req['decodedData'].email;
    console.log("email ===> ", email);
    console.log(data);
    
    return this.userService.changePassword(data, email);
  }
}
