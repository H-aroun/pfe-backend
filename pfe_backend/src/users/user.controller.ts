import { Body, Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.services';
import { User } from './user.entity';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoleGuard } from 'src/role/role.guard';

@UseGuards(AuthGuard, RoleGuard)
@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Get all users
  @Get()
  async getAllUsers(): Promise<User[]> {
    return this.userService.getAllUsers();
  }

  // Get user by EMAIL
  @Get('email/:email')
  async getUserByEmail(@Param('email') email: string): Promise<User | null> {
    return this.userService.getUserByEmail(email);
  }

  // Get user by ID
  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<User | null> {
    return this.userService.getUserById(id);
  }
}
