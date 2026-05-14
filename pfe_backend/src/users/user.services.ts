import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
}
/*
async createSecureServer( name: string, email: string, password: string): Promise<User> {
    const newUser = this.userRepository.create({ name, email, password });
    return this.userRepository.save(newUser);
  }}*/
