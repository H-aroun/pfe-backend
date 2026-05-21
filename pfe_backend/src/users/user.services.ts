/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDTO } from './dto/createUser.dto';
import { ChangePasswordDTO } from './dto/changePassword.dto';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: Number(id) },
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });
  }

  async createUser(data: CreateUserDTO): Promise<User> {
    const exist = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (exist) throw new BadRequestException('Email exist déja');
    const newUser = this.userRepository.create(data);
    return this.userRepository.save(newUser);
  }

  async changePassword(
    data: ChangePasswordDTO,
    email: string,
  ): Promise<{message: string} | undefined> {
    const exist = await this.userRepository.findOne({
      where: { email },
    });
    console.log('dataaa ', data);

    if (exist) {
      if (!(await bcrypt.compare(data.currentPassword, exist.password))) {
        throw new BadRequestException('Invalid current password');
      }
      if (data.confirmPassword === data.newPassword) {
        const hashedPassword = await bcrypt.hash(data.confirmPassword, 10);
        await this.userRepository.update(exist.id, {
          ...exist,
          password: hashedPassword,
        });
        return { message: 'password changed successfuly' };
      } else {
        throw new BadRequestException('passwords does not match');
      }
    }
  }
}
