import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { User } from './model/users.model';
import { UsersRepository } from './users.repository';
import { Profile } from './model/profile.model';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getAllUsers(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async getProfile(id: string): Promise<Profile | null> {
    return this.usersRepository.findProfileById(id);
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

  async setRefreshToken(userId: string, hashedToken: string | null) {
    return this.usersRepository.updateRefreshToken(userId, hashedToken);
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.usersRepository.update(id, data);
  }

  async deleteUser(id: string) {
    return this.usersRepository.delete(id);
  }
}
