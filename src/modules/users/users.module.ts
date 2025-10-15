import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserController } from './users.controller';

@Module({
  providers: [UsersService, UsersRepository],
  controllers: [UserController],
  exports: [UsersService],
})
export class UsersModule {}
