import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { User } from './users.model';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getById(id: number): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async createUser(data: {
    email: string;
    password: string;
    fullName: string;
  }) {
    return this.usersRepository.create(data);
  }

  async setRefreshToken(userId: number, hashedToken: string | null) {
    return this.usersRepository.updateRefreshToken(userId, hashedToken);
  }

  async updateUser(id: number, data: Prisma.UserUpdateInput) {
    return this.usersRepository.update(id, data);
  }

  async deleteUser(id: number) {
    return this.usersRepository.delete(id);
  }
}
