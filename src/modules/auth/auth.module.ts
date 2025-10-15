import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { Module } from '@nestjs/common';
import { UsersModule } from 'src/modules/users/users.module';
import { AccountsModule } from 'src/modules/accounts/accounts.module';
import { AuthRepository } from './auth.repository';

@Module({
  imports: [
    UsersModule,
    AccountsModule,
    JwtModule.register({
      secret: process.env.JWT_TOKEN_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthRepository],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
