import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { TransactionsService } from '../../modules/transactions/transactions.service';
import { TransactionDto } from '../../modules/transactions/dto/transaction.dto';
import { CreateTransactionDto } from '../../modules/transactions/dto/create-transaction.dto';
import { BaseLoggerProxy } from './base-logger.proxy';
import { TransactionsRepositoryProxy } from './transactions-repository.proxy';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class TransactionsServiceProxy extends BaseLoggerProxy {
  private readonly MAX_TRANSACTION_AMOUNT = 1000000; // Максимальна сума транзакції
  private readonly MIN_TRANSACTION_AMOUNT = 0.1;

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly transactionsRepository: TransactionsRepositoryProxy,
    @Optional() @Inject(MonitoringService) monitoringService?: MonitoringService,
  ) {
    super('TransactionsService', monitoringService);
  }

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
    userId?: string,
  ): Promise<TransactionDto> {
    const startTime = Date.now();
    const { fromCardNumber, toCardNumber, amount, currency, description } =
      createTransactionDto;

    const context = {
      operation: 'createTransaction',
      module: 'transactions',
      userId,
      metadata: {
        fromCardNumber: this.maskCardNumber(fromCardNumber),
        toCardNumber: this.maskCardNumber(toCardNumber),
        amount,
        currency,
        hasDescription: !!description,
      },
    };

    try {
      // Валідація максимальної суми
      if (amount > this.MAX_TRANSACTION_AMOUNT) {
        const error = new BadRequestException(
          `Transaction amount exceeds maximum limit of ${this.MAX_TRANSACTION_AMOUNT}`,
        );
        this.logOperation('warn', context, 'Validation failed: amount exceeds maximum');
        throw error;
      }

      // Валідація мінімальної суми
      if (amount < this.MIN_TRANSACTION_AMOUNT) {
        const error = new BadRequestException(
          `Transaction amount must be at least ${this.MIN_TRANSACTION_AMOUNT}`,
        );
        this.logOperation('warn', context, 'Validation failed: amount below minimum');
        throw error;
      }

      // Перевірка прав доступу, якщо userId передано
      if (userId) {
        await this.validateUserAccess(userId, fromCardNumber, context);
      }

      this.logOperation('info', context, 'Creating transaction');

      const result = await this.transactionsService.createTransaction(
        createTransactionDto,
      );

      this.logWithDuration(context, startTime, true);
      this.logOperation('info', {
        ...context,
        metadata: {
          ...context.metadata,
          transactionId: result.id,
          success: true,
        },
      }, `Transaction created successfully: ${result.id}`);

      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getAllTransactions(): Promise<TransactionDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getAllTransactions',
      module: 'transactions',
    };

    try {
      this.logOperation('info', context, 'Fetching all transactions');
      const result = await this.transactionsService.getAllTransactions();
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
      this.logOperation('warn', context, 'Validation failed: invalid transaction id');
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching transaction ${id}`);
      const result = await this.transactionsService.getTransactionById(id);
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
      this.logOperation('info', context, `Fetching transactions for card ${cardId}`);
      const result = await this.transactionsService.getTransactionsByCardId(cardId);
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
      this.logOperation('warn', context, 'Validation failed: invalid cardNumber');
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching transactions for card ${this.maskCardNumber(cardNumber)}`);
      const result = await this.transactionsService.getTransactionsByCardNumber(cardNumber);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  private async validateUserAccess(
    userId: string,
    cardNumber: string,
    context: any,
  ): Promise<void> {
    try {
      const card = await this.transactionsRepository.getCardWithAccount(cardNumber);
      
      if (!card) {
        // Якщо картки немає, валідація пройде в основному сервісі
        return;
      }

      if (card.account.userId !== userId) {
        const error = new ForbiddenException(
          'You do not have permission to perform transactions from this card',
        );
        this.logOperation('warn', {
          ...context,
          metadata: {
            ...context.metadata,
            attemptedCardOwner: card.account.userId,
            currentUserId: userId,
          },
        }, 'Security check failed: user does not own the card');
        throw error;
      }
    } catch (error) {
      // Якщо помилка вже ForbiddenException, пробрасываем її
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Інші помилки ігноруємо, вони будуть оброблені в основному сервісі
    }
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }
    return '****' + cardNumber.slice(-4);
  }
}

