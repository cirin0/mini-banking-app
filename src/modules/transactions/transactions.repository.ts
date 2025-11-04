import { Injectable, NotFoundException } from '@nestjs/common';
import { Currency, Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { TransactionDto } from './dto/transaction.dto';

type CardWithAccount = Prisma.CardGetPayload<{
  include: { account: true };
}>;

type TransactionWithCards = Prisma.TransactionGetPayload<{
  select: {
    id: true;
    amount: true;
    currency: true;
    description: true;
    fromCard: { select: { cardNumber: true } };
    toCard: { select: { cardNumber: true } };
    createdAt: true;
  };
}>;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly transactionSelect = {
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
  } as const;

  private mapToDto(transaction: TransactionWithCards): TransactionDto {
    return {
      id: transaction.id,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      fromCardNumber: transaction.fromCard.cardNumber,
      toCardNumber: transaction.toCard.cardNumber,
      description: transaction.description || undefined,
      createdAt: transaction.createdAt,
    };
  }

  async getAllTransactions(): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      select: this.transactionSelect,
    });

    return transactions.map((transaction) => this.mapToDto(transaction));
  }

  async getTransactionsByCardId(cardId: string): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ fromCardId: cardId }, { toCardId: cardId }],
      },
      select: this.transactionSelect,
    });

    return transactions.map((transaction) => this.mapToDto(transaction));
  }

  async getTransactionsByCardNumber(
    cardNumber: string,
  ): Promise<TransactionDto[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [{ fromCard: { cardNumber } }, { toCard: { cardNumber } }],
      },
      select: this.transactionSelect,
    });

    return transactions.map((transaction) => this.mapToDto(transaction));
  }

  async getTransactionById(id: string): Promise<TransactionDto> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      select: this.transactionSelect,
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with id ${id} not found`);
    }

    return this.mapToDto(transaction);
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
        select: this.transactionSelect,
      });

      return this.mapToDto(transaction);
    });
  }
}
