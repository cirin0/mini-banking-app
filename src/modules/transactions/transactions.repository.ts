import { Injectable } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { TransactionDto } from './dto/transaction.dto';

type CardWithAccount = Prisma.CardGetPayload<{
  include: { account: true };
}>;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTransactions(): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        fromCard: {
          select: {
            cardNumber: true,
          },
        },
        toCard: {
          select: {
            cardNumber: true,
          },
        },
        createdAt: true,
      },
    });

    return transactions.map((transaction) => {
      const dto: TransactionDto = {
        id: transaction.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        fromCardNumber: transaction.fromCard.cardNumber,
        toCardNumber: transaction.toCard.cardNumber,
        createdAt: transaction.createdAt,
      };

      if (transaction.description) {
        dto.description = transaction.description;
      }

      return dto;
    });
  }

  async getTransactionsByCardId(cardId: string): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ fromCardId: cardId }, { toCardId: cardId }],
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        fromCard: {
          select: {
            cardNumber: true,
          },
        },
        toCard: {
          select: {
            cardNumber: true,
          },
        },
        createdAt: true,
      },
    });

    return transactions.map((transaction) => {
      const dto: TransactionDto = {
        id: transaction.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        fromCardNumber: transaction.fromCard.cardNumber,
        toCardNumber: transaction.toCard.cardNumber,
        createdAt: transaction.createdAt,
      };

      if (transaction.description) {
        dto.description = transaction.description;
      }

      return dto;
    });
  }

  async getTransactionsByCardNumber(
    cardNumber: string,
  ): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          { fromCard: { cardNumber: cardNumber } },
          { toCard: { cardNumber: cardNumber } },
        ],
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        fromCard: {
          select: {
            cardNumber: true,
          },
        },
        toCard: {
          select: {
            cardNumber: true,
          },
        },
        createdAt: true,
      },
    });

    return transactions.map((transaction) => {
      const dto: TransactionDto = {
        id: transaction.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        fromCardNumber: transaction.fromCard.cardNumber,
        toCardNumber: transaction.toCard.cardNumber,
        createdAt: transaction.createdAt,
      };

      if (transaction.description) {
        dto.description = transaction.description;
      }

      return dto;
    });
  }

  async getTransactionById(id: string): Promise<TransactionDto | null> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        currency: true,
        description: true,
        fromCard: {
          select: {
            cardNumber: true,
          },
        },
        toCard: {
          select: {
            cardNumber: true,
          },
        },
        createdAt: true,
      },
    });

    if (!transaction) {
      return null;
    }
    const dto: TransactionDto = {
      id: transaction.id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      fromCardNumber: transaction.fromCard.cardNumber,
      toCardNumber: transaction.toCard.cardNumber,
      createdAt: transaction.createdAt,
    };

    if (transaction.description) {
      dto.description = transaction.description;
    }
    return dto;
  }

  async getCardWithAccount(
    cardNumber: string,
  ): Promise<CardWithAccount | null> {
    return this.prisma.card.findUnique({
      where: { cardNumber },
      include: { account: true },
    });
  }

  async executeTransaction(
    fromCard: CardWithAccount,
    toCard: CardWithAccount,
    amount: number,
    currency: Currency,
    description?: string,
  ): Promise<TransactionDto> {
    return this.prisma.$transaction(async (prisma) => {
      await prisma.account.update({
        where: { id: fromCard.accountId },
        data: {
          balance: { decrement: amount },
        },
      });

      await prisma.account.update({
        where: { id: toCard.accountId },
        data: {
          balance: { increment: amount },
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          amount,
          currency,
          description,
          fromCardId: fromCard.id,
          toCardId: toCard.id,
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          fromCard: {
            select: { cardNumber: true },
          },
          toCard: {
            select: { cardNumber: true },
          },
          createdAt: true,
        },
      });

      const result: TransactionDto = {
        id: transaction.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        fromCardNumber: transaction.fromCard.cardNumber,
        toCardNumber: transaction.toCard.cardNumber,
        createdAt: transaction.createdAt,
      };

      if (transaction.description) {
        result.description = transaction.description;
      }

      return result;
    });
  }
}
