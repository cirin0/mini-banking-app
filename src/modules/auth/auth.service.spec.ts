/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';

// Mock bcrypt на рівні модуля
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { UsersService } from 'src/modules/users/users.service';
import { AccountsService } from 'src/modules/accounts/accounts.service';
import { AuthRepository } from './auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let authRepository: AuthRepository;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    password: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
    refreshToken: null,
  };

  const mockUserWithoutPassword = {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResponse = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            getByEmail: jest.fn(),
            createUser: jest.fn(),
            setRefreshToken: jest.fn(),
          },
        },
        {
          provide: AccountsService,
          useValue: {
            createAccountForUser: jest.fn(),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            findByEmailWithPassword: jest.fn(),
            findByIdWithRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    authRepository = module.get<AuthRepository>(AuthRepository);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      jest.spyOn(usersService, 'getByEmail').mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      jest
        .spyOn(usersService, 'createUser')
        .mockResolvedValue(mockUserWithoutPassword);

      const result = await service.register(
        'Test User',
        'test@example.com',
        'password123',
      );

      expect(usersService.getByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.createUser).toHaveBeenCalledWith({
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      expect(result).toEqual(mockUserWithoutPassword);
    });

    it('should throw BadRequestException if user already exists', async () => {
      jest
        .spyOn(usersService, 'getByEmail')
        .mockResolvedValue(mockUserWithoutPassword);

      await expect(
        service.register('Test User', 'test@example.com', 'password123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.register('Test User', 'test@example.com', 'password123'),
      ).rejects.toThrow('User already exists');
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(authRepository.findByEmailWithPassword).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        refreshToken: mockUser.refreshToken,
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user does not exist', async () => {
      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password123',
      );

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('handleLogin', () => {
    it('should successfully login user and set refresh token cookie', async () => {
      const mockAccessToken = 'mockAccessToken';
      const mockRefreshToken = 'mockRefreshToken';
      const mockHashedRefreshToken = 'hashedRefreshToken';

      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedRefreshToken);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');
      jest.spyOn(configService, 'get').mockReturnValue('development');
      jest.spyOn(usersService, 'setRefreshToken').mockResolvedValue(mockUser);

      const result = await service.handleLogin(
        'test@example.com',
        'password123',
        mockResponse,
      );

      expect(result).toEqual({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockRefreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          secure: false,
        }),
      );
      expect(usersService.setRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        mockHashedRefreshToken,
      );
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(null);

      await expect(
        service.handleLogin('test@example.com', 'wrongPassword', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleLogin('test@example.com', 'wrongPassword', mockResponse),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('handleLogout', () => {
    it('should successfully logout user and clear refresh token', async () => {
      jest.spyOn(usersService, 'setRefreshToken').mockResolvedValue(mockUser);

      const result = await service.handleLogout('1', mockResponse);

      expect(usersService.setRefreshToken).toHaveBeenCalledWith('1', null);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken', {
        path: '/',
      });
      expect(result).toEqual({
        statusCode: 200,
        message: 'Logged out successfully',
      });
    });
  });

  describe('handleRefreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const mockOldRefreshToken = 'oldRefreshToken';
      const mockNewAccessToken = 'newAccessToken';
      const mockNewRefreshToken = 'newRefreshToken';
      const mockHashedRefreshToken = 'hashedRefreshToken';

      const userWithRefreshToken = {
        id: '1',
        email: 'test@example.com',
        refreshToken: 'hashedOldRefreshToken',
      };

      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: '1', email: 'test@example.com' });
      jest
        .spyOn(authRepository, 'findByIdWithRefreshToken')
        .mockResolvedValue(userWithRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(mockNewAccessToken)
        .mockReturnValueOnce(mockNewRefreshToken);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedRefreshToken);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');
      jest.spyOn(configService, 'get').mockReturnValue('development');
      jest.spyOn(usersService, 'setRefreshToken').mockResolvedValue(mockUser);

      const result = await service.handleRefreshTokens(
        mockOldRefreshToken,
        mockResponse,
      );

      expect(result).toEqual({
        accessToken: mockNewAccessToken,
        refreshToken: mockNewRefreshToken,
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockNewRefreshToken,
        expect.any(Object),
      );
      expect(usersService.setRefreshToken).toHaveBeenCalledWith(
        '1',
        mockHashedRefreshToken,
      );
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      await expect(
        service.handleRefreshTokens('invalidToken', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user has no refresh token', async () => {
      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: 1, email: 'test@example.com' });
      jest.spyOn(authRepository, 'findByIdWithRefreshToken').mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        refreshToken: null,
      });
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      await expect(
        service.handleRefreshTokens('validToken', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.handleRefreshTokens('validToken', mockResponse),
      ).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedException when refresh token does not match', async () => {
      const userWithRefreshToken = {
        id: '1',
        email: 'test@example.com',
        refreshToken: 'hashedDifferentToken',
      };

      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ sub: 1, email: 'test@example.com' });
      jest
        .spyOn(authRepository, 'findByIdWithRefreshToken')
        .mockResolvedValue(userWithRefreshToken);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');

      await expect(
        service.handleRefreshTokens('wrongToken', mockResponse),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Cookie options', () => {
    it('should set secure cookie in production', async () => {
      const mockAccessToken = 'mockAccessToken';
      const mockRefreshToken = 'mockRefreshToken';

      jest
        .spyOn(authRepository, 'findByEmailWithPassword')
        .mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jest
        .spyOn(jwtService, 'sign')
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      jest.spyOn(configService, 'getOrThrow').mockReturnValue('secret');
      jest.spyOn(configService, 'get').mockReturnValue('production');
      jest.spyOn(usersService, 'setRefreshToken').mockResolvedValue(mockUser);

      await service.handleLogin(
        'test@example.com',
        'password123',
        mockResponse,
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        mockRefreshToken,
        expect.objectContaining({
          secure: true,
        }),
      );
    });
  });
});
