import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/modules/users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CookieOptions, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/modules/users/users.model';
import { AuthRepository } from './auth.repository';

interface UserPayload {
  id: number;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly usersService: UsersService,
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data, salt);
  }

  private async verifyHash(data: string, hash: string): Promise<boolean> {
    return bcrypt.compare(data, hash);
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: this.REFRESH_COOKIE_MAX_AGE,
      secure: this.configService.get('NODE_ENV') === 'production',
    };
  }

  private generateTokens(user: UserPayload): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_TOKEN_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    return { accessToken, refreshToken };
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refreshToken', refreshToken, this.getRefreshCookieOptions());
  }

  async register(
    fullName: string,
    email: string,
    password: string,
  ): Promise<User> {
    const existingUser = await this.usersService.getByEmail(email);
    if (existingUser) throw new BadRequestException('User already exists');

    const hashedPassword = await this.hashData(password);

    const user = await this.usersService.createUser({
      fullName: fullName,
      email: email,
      password: hashedPassword,
    });
    return user;
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserPayload | null> {
    const user = await this.authRepository.findByEmailWithPassword(email);

    if (!user) return null;

    const isPasswordValid = await this.verifyHash(password, user.password);
    if (!isPasswordValid) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async login(
    user: UserPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokens = this.generateTokens(user);
    const hashedRefreshToken = await this.hashData(tokens.refreshToken);
    await this.usersService.setRefreshToken(user.id, hashedRefreshToken);

    return tokens;
  }

  private async revokeRefreshToken(userId: number): Promise<void> {
    await this.usersService.setRefreshToken(userId, null);
  }

  private async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.authRepository.findByIdWithRefreshToken(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await this.verifyHash(
      refreshToken,
      user.refreshToken,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = this.generateTokens({ id: user.id, email: user.email });
    const hashedRefreshToken = await this.hashData(tokens.refreshToken);
    await this.usersService.setRefreshToken(user.id, hashedRefreshToken);

    return tokens;
  }

  private async verifyAndRefreshTokens(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const decoded = this.jwtService.verify<{
        sub: number;
        email: string;
      }>(token, {
        secret: this.configService.getOrThrow('JWT_REFRESH_TOKEN_SECRET'),
      });

      return await this.refreshTokens(decoded.sub, token);
    } catch (error) {
      throw new UnauthorizedException(`Invalid refresh token: ${error}`);
    }
  }

  async handleLogin(
    email: string,
    password: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.login(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  async handleLogout(
    userId: number,
    res: Response,
  ): Promise<{ message: string; statusCode: number }> {
    await this.revokeRefreshToken(userId);
    res.clearCookie('refreshToken', { path: '/' });

    return {
      statusCode: 200,
      message: 'Logged out successfully',
    };
  }

  async handleRefreshTokens(
    token: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    const tokens = await this.verifyAndRefreshTokens(token);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }
}
