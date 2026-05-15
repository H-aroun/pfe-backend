import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.services';
import { User } from './user.entity';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RoleGuard } from 'src/role/role.guard';
import { CreateUserDTO } from './dto/createUser.dto';

@ApiBearerAuth('access-token')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  async createUser(@Body() data: CreateUserDTO): Promise<User> {
    console.log('data ', data);

    const result = await this.userService.createUser(data);
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
}
