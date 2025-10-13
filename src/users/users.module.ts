import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'prisma/prisma.service';
import { UsersRepository } from './users.repository';
import { UserController } from './users.controller';

@Module({
  providers: [UsersService, UsersRepository, PrismaService],
  controllers: [UserController],
  exports: [UsersService],
})
export class UsersModule {}
