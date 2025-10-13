import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { PrismaService } from 'prisma/prisma.service';
import { AuthRepository } from './auth.repository';

@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_TOKEN_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthRepository, PrismaService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
