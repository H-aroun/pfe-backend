/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from 'src/role/role.entity';
import { User } from './user.entity';
import {
  AdminCreateUserDTO,
  AdminUpdateUserDTO,
  CreateUserDTO,
  UpdateUserDTO,
} from './dto/createUser.dto';

export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  toSafeUser(user: User): SafeUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user;
    return safeUser;
  }

  toSafeUsers(users: User[]): SafeUser[] {
    return users.map((user) => this.toSafeUser(user));
  }

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.find({ relations: ['role'] });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: Number(id) },
      relations: ['role'],
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
    if (exist) throw new BadRequestException('Email already exists');

    const teacherRole = await this.roleRepository.findOne({
      where: { name: 'teacher' },
    });
    if (!teacherRole) {
      throw new BadRequestException('Default teacher role is not configured');
    }

    const newUser = this.userRepository.create({
      ...data,
      dateInscription: data.dateInscription
        ? new Date(data.dateInscription)
        : new Date(),
      role: teacherRole,
    });
    return this.userRepository.save(newUser);
  }

  async createManagedUser(data: AdminCreateUserDTO): Promise<User> {
    const exist = await this.userRepository.findOne({
      where: { email: data.email },
    });
    if (exist) throw new BadRequestException('Email already exists');

    const role = await this.findRole(data.role ?? 'teacher');
    const newUser = this.userRepository.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      dateInscription: data.dateInscription
        ? new Date(data.dateInscription)
        : new Date(),
      role,
    });

    return this.userRepository.save(newUser);
  }

  async updateUser(id: number, data: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    if (data.email && data.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: data.email },
      });
      if (existing) throw new BadRequestException('Email already exists');
    }

    Object.assign(user, data);
    await this.userRepository.save(user);

    const updated = await this.getUserById(String(id));
    if (!updated) throw new NotFoundException(`User #${id} not found`);
    return updated;
  }

  async updateUserRole(id: number, roleName: string): Promise<User> {
    const role = await this.findRole(roleName);

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    user.role = role;
    await this.userRepository.save(user);

    const updated = await this.getUserById(String(id));
    if (!updated) throw new NotFoundException(`User #${id} not found`);
    return updated;
  }

  async updateManagedUser(id: number, data: AdminUpdateUserDTO): Promise<User> {
    const { role, ...profile } = data;
    const user = await this.updateUser(id, profile);

    if (!role) return user;
    return this.updateUserRole(id, role);
  }

  async deleteUser(id: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    await this.userRepository.remove(user);
  }

  private async findRole(roleName: string): Promise<Role> {
    const normalizedRole = roleName.toLowerCase();
    const role = await this.roleRepository.findOne({
      where: { name: normalizedRole },
    });
    if (!role) throw new NotFoundException(`Role "${roleName}" not found`);
    return role;
  }
}
