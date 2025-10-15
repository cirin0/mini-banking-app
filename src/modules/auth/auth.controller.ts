import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import express from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from 'src/modules/users/users.model';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface AuthenticatedRequest extends express.Request {
  user: {
    id: number;
    email: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private extractRefreshToken(req: express.Request): string {
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.refreshToken;

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('No refresh token provided');
    }

    return token;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<User> {
    return this.authService.register(dto.fullName, dto.email, dto.password);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ accessToken: string }> {
    return this.authService.handleLogin(dto.email, dto.password, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ message: string; statusCode: number }> {
    return this.authService.handleLogout(req.user.id, res);
  }

  @Post('refresh')
  async refreshTokens(
    @Req() req: express.Request,
    @Res({ passthrough: true }) res: express.Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = this.extractRefreshToken(req);
    return this.authService.handleRefreshTokens(refreshToken, res);
  }
}
