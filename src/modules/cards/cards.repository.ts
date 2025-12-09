import { Injectable } from '@nestjs/common';
import { CardType, PaymentSystem } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CardDto } from './dto/card.dto';
import { generateValidCardNumber } from 'src/common/utils/card-validator.util';
import { encryptCvv } from 'src/common/utils/crypto.util';
import * as crypto from 'crypto';

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateCVV(): string {
    // Use a cryptographically secure random number generator for each digit
    return Array.from({ length: 3 }, () => crypto.randomInt(0, 10)).join('');
  }

  async create(
    accountId: string,
    cardType: CardType,
    paymentSystem: PaymentSystem,
  ): Promise<CardDto> {
    const cardNumber = generateValidCardNumber(paymentSystem);

    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    const cvv = this.generateCVV();
    const encryptedCvv = encryptCvv(cvv);

    return this.prisma.card.create({
      data: {
        accountId,
        cardType,
        paymentSystem,
        cardNumber,
        expiryDate,
        hashedCvv: encryptedCvv,
      },
      select: {
        id: true,
        cardNumber: true,
        cardType: true,
        paymentSystem: true,
        expiryDate: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async countCardsByAccountId(accountId: string): Promise<number> {
    return this.prisma.card.count({
      where: { accountId },
    });
  }

  async findById(cardId: string): Promise<CardDto | null> {
    return this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        cardNumber: true,
        cardType: true,
        paymentSystem: true,
        expiryDate: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByAccountId(accountId: string): Promise<CardDto[]> {
    return this.prisma.card.findMany({
      where: { accountId },
      select: {
        id: true,
        cardNumber: true,
        cardType: true,
        paymentSystem: true,
        expiryDate: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByCardNumber(cardNumber: string): Promise<CardDto | null> {
    return this.prisma.card.findUnique({
      where: { cardNumber },
      select: {
        id: true,
        cardNumber: true,
        cardType: true,
        paymentSystem: true,
        expiryDate: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<CardDto[]> {
    return this.prisma.card.findMany({
      where: { account: { userId } },
      select: {
        id: true,
        cardNumber: true,
        cardType: true,
        paymentSystem: true,
        expiryDate: true,
        accountId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteByAccountId(
    accountId: string,
  ): Promise<{ deletedCount: number }> {
    await this.prisma.transaction.deleteMany({
      where: {
        OR: [{ fromCard: { accountId } }, { toCard: { accountId } }],
      },
    });

    const result = await this.prisma.card.deleteMany({
      where: { accountId },
    });
    return { deletedCount: result.count };
  }

  async findByIdWithHashedCvv(cardId: string): Promise<{
    hashedCvv: string | null;
    cardNumber: string;
    expiryDate: Date;
    account: { id: string; userId: string };
  } | null> {
    return this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        hashedCvv: true,
        cardNumber: true,
        expiryDate: true,
        account: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });
  }
}
