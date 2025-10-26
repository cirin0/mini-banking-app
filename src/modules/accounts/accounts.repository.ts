import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Account, Currency } from '@prisma/client';

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deposit(accountId: string, amount: number) {
    return this.prisma.account.update({
      where: { id: accountId },
      data: {
        balance: {
          increment: amount,
        },
      },
    });
  }

  async create(userId: string, currency: Currency): Promise<Account> {
    return this.prisma.account.create({
      data: {
        userId,
        currency,
        balance: 0,
      },
      select: {
        id: true,
        balance: true,
        currency: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        balance: true,
        currency: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: { fullName: true },
        },
        cards: {
          select: {
            id: true,
            cardNumber: true,
            cardType: true,
            paymentSystem: true,
            expiryDate: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        balance: true,
        currency: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        User: {
          select: { fullName: true },
        },
      },
    });
  }

  async userAccountCount(userId: string): Promise<number> {
    return this.prisma.account.count({ where: { userId } });
  }

  async existingAccountInCurrency(
    userId: string,
    currency: Currency,
  ): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { userId, currency },
    });
  }
}
