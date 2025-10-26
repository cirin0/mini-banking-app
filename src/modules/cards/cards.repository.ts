import { Injectable } from '@nestjs/common';
import { CardType, PaymentSystem } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CardDto } from './dto/card.dto';
import { generateValidCardNumber } from 'src/common/utils/card-validator.util';

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generateCVV(): string {
    return Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join(
      '',
    );
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
    const hashedCvv = await bcrypt.hash(cvv, 10);

    return this.prisma.card.create({
      data: {
        accountId,
        cardType,
        paymentSystem,
        cardNumber,
        expiryDate,
        hashedCvv,
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
}
