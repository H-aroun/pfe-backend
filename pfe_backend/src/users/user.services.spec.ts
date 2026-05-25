import { BadRequestException } from '@nestjs/common';
import { Role } from 'src/role/role.entity';
import { User } from './user.entity';
import { UserService } from './user.services';

type RepoMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
};

function repoMock(): RepoMock {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((data: unknown) => data),
    save: jest.fn((data: unknown) => Promise.resolve(data)),
    remove: jest.fn(() => Promise.resolve()),
  };
}

describe('UserService', () => {
  let userRepo: RepoMock;
  let roleRepo: RepoMock;
  let service: UserService;

  beforeEach(() => {
    userRepo = repoMock();
    roleRepo = repoMock();
    service = new UserService(userRepo as never, roleRepo as never);
  });

  it('removes password hashes from safe user responses', () => {
    const safeUser = service.toSafeUser({
      id: 1,
      firstName: 'Jean',
      lastName: 'Dupont',
      email: 'teacher@example.com',
      password: 'hashed-secret',
      role: { id: 2, name: 'teacher' } as Role,
      dateInscription: new Date(),
      updatedAt: new Date(),
      scenarios: [],
      rapports: [],
    });

    expect(safeUser).not.toHaveProperty('password');
    expect(safeUser.email).toBe('teacher@example.com');
  });

  it('assigns the default teacher role during public registration', async () => {
    const teacherRole = { id: 2, name: 'teacher' } as Role;
    const requestedAdminRole = { id: 1, name: 'admin' } as Role;

    userRepo.findOne.mockResolvedValueOnce(null);
    roleRepo.findOne.mockResolvedValueOnce(teacherRole);

    await service.createUser({
      firstName: 'New',
      lastName: 'Teacher',
      email: 'new@example.com',
      password: 'hashed',
      role: requestedAdminRole,
    });

    expect(roleRepo.findOne).toHaveBeenCalledWith({
      where: { name: 'teacher' },
    });
    expect(userRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'new@example.com',
        role: teacherRole,
      }),
    );
  });

  it('rejects duplicate registration emails', async () => {
    userRepo.findOne.mockResolvedValueOnce({ id: 1 });

    await expect(
      service.createUser({
        firstName: 'Taken',
        lastName: 'Email',
        email: 'taken@example.com',
        password: 'hashed',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normalizes role names when updating user roles', async () => {
    const adminRole = { id: 1, name: 'admin' } as Role;
    const user = {
      id: 4,
      firstName: 'Role',
      lastName: 'Target',
      email: 'role@example.com',
      password: 'hashed',
      role: { id: 2, name: 'teacher' } as Role,
    } as User;

    roleRepo.findOne.mockResolvedValueOnce(adminRole);
    userRepo.findOne.mockResolvedValueOnce(user);
    userRepo.findOne.mockResolvedValueOnce({ ...user, role: adminRole });

    const updated = await service.updateUserRole(4, 'ADMIN');

    expect(roleRepo.findOne).toHaveBeenCalledWith({ where: { name: 'admin' } });
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ role: adminRole }),
    );
    expect(updated.role.name).toBe('admin');
  });
});
