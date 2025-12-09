import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { TransactionsRepository } from '../../modules/transactions/transactions.repository';
import { TransactionDto } from '../../modules/transactions/dto/transaction.dto';
import { Currency, Prisma } from '@prisma/client';
import { BaseLoggerProxy } from './base-logger.proxy';
import { MonitoringService } from 'src/modules/monitoring/monitoring.service';

type CardWithAccount = Prisma.CardGetPayload<{
  include: { account: true };
}>;

@Injectable()
export class TransactionsRepositoryProxy extends BaseLoggerProxy {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    @Optional()
    @Inject(MonitoringService)
    monitoringService?: MonitoringService,
  ) {
    super('TransactionsRepository', monitoringService);
  }

  async getAllTransactions(): Promise<TransactionDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getAllTransactions',
      module: 'transactions',
    };

    try {
      this.logOperation('info', context, 'Fetching all transactions');
      const result = await this.transactionsRepository.getAllTransactions();
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getTransactionsByCardId(cardId: string): Promise<TransactionDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getTransactionsByCardId',
      module: 'transactions',
      metadata: { cardId },
    };

    // Валідація параметрів
    if (!cardId || typeof cardId !== 'string') {
      const error = new BadRequestException('Invalid cardId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid cardId');
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Fetching transactions for card ${cardId}`,
      );
      const result =
        await this.transactionsRepository.getTransactionsByCardId(cardId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getTransactionsByCardNumber(
    cardNumber: string,
  ): Promise<TransactionDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getTransactionsByCardNumber',
      module: 'transactions',
      metadata: { cardNumber: this.maskCardNumber(cardNumber) },
    };

    // Валідація параметрів
    if (!cardNumber || typeof cardNumber !== 'string') {
      const error = new BadRequestException('Invalid cardNumber parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid cardNumber',
      );
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Fetching transactions for card ${this.maskCardNumber(cardNumber)}`,
      );
      const result =
        await this.transactionsRepository.getTransactionsByCardNumber(
          cardNumber,
        );
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getTransactionById(id: string): Promise<TransactionDto> {
    const startTime = Date.now();
    const context = {
      operation: 'getTransactionById',
      module: 'transactions',
      metadata: { transactionId: id },
    };

    // Валідація параметрів
    if (!id || typeof id !== 'string') {
      const error = new BadRequestException('Invalid transaction id parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid transaction id',
      );
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching transaction ${id}`);
      const result = await this.transactionsRepository.getTransactionById(id);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCardWithAccount(
    cardNumber: string,
  ): Promise<CardWithAccount | null> {
    const startTime = Date.now();
    const context = {
      operation: 'getCardWithAccount',
      module: 'transactions',
      metadata: { cardNumber: this.maskCardNumber(cardNumber) },
    };

    // Валідація параметрів
    if (!cardNumber || typeof cardNumber !== 'string') {
      const error = new BadRequestException('Invalid cardNumber parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid cardNumber',
      );
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Fetching card with account for ${this.maskCardNumber(cardNumber)}`,
      );
      const result =
        await this.transactionsRepository.getCardWithAccount(cardNumber);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async executeTransaction(
    fromCard: CardWithAccount,
    toCard: CardWithAccount,
    amount: number,
    currency: Currency,
    description?: string,
  ): Promise<TransactionDto> {
    const startTime = Date.now();
    const context = {
      operation: 'executeTransaction',
      module: 'transactions',
      metadata: {
        fromCardNumber: this.maskCardNumber(fromCard.cardNumber),
        toCardNumber: this.maskCardNumber(toCard.cardNumber),
        amount,
        currency,
        hasDescription: !!description,
      },
    };

    // Валідація параметрів
    if (!fromCard || !toCard) {
      const error = new BadRequestException('Invalid card parameters');
      this.logOperation('warn', context, 'Validation failed: invalid cards');
      throw error;
    }

    if (!amount || amount <= 0 || typeof amount !== 'number') {
      const error = new BadRequestException('Invalid amount parameter');
      this.logOperation('warn', context, 'Validation failed: invalid amount');
      throw error;
    }

    if (!currency || typeof currency !== 'string') {
      const error = new BadRequestException('Invalid currency parameter');
      this.logOperation('warn', context, 'Validation failed: invalid currency');
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Executing transaction: ${amount} ${currency}`,
      );
      const result = await this.transactionsRepository.executeTransaction(
        fromCard,
        toCard,
        amount,
        currency,
        description,
      );
      this.logWithDuration(context, startTime, true);
      this.logOperation(
        'info',
        {
          ...context,
          metadata: {
            ...context.metadata,
            transactionId: result.id,
          },
        },
        `Transaction executed successfully: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }
    return '****' + cardNumber.slice(-4);
  }
}
