import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { AccountsRepository } from '../../modules/accounts/accounts.repository';
import { Account, Currency } from '@prisma/client';
import { Account as AccountModel } from '../../modules/accounts/accounts.model';
import { BaseLoggerProxy } from './base-logger.proxy';
import { MonitoringService } from 'src/modules/monitoring/monitoring.service';

@Injectable()
export class AccountsRepositoryProxy extends BaseLoggerProxy {
  private readonly MAX_DEPOSIT_AMOUNT = 1000000;
  private readonly MIN_DEPOSIT_AMOUNT = 0.01;

  constructor(
    private readonly accountsRepository: AccountsRepository,
    @Optional()
    @Inject(MonitoringService)
    monitoringService?: MonitoringService,
  ) {
    super('AccountsRepository', monitoringService);
  }

  async deposit(accountId: string, amount: number): Promise<Account> {
    const startTime = Date.now();
    const context = {
      operation: 'deposit',
      module: 'accounts',
      metadata: {
        accountId,
        amount,
      },
    };

    // Валідація параметрів
    if (!accountId || typeof accountId !== 'string') {
      const error = new BadRequestException('Invalid accountId parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid accountId',
      );
      throw error;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      const error = new BadRequestException('Invalid amount parameter');
      this.logOperation('warn', context, 'Validation failed: invalid amount');
      throw error;
    }

    // Валідація максимальної суми депозиту
    if (amount > this.MAX_DEPOSIT_AMOUNT) {
      const error = new BadRequestException(
        `Deposit amount exceeds maximum limit of ${this.MAX_DEPOSIT_AMOUNT}`,
      );
      this.logOperation(
        'warn',
        context,
        'Validation failed: amount exceeds maximum',
      );
      throw error;
    }

    // Валідація мінімальної суми депозиту
    if (amount < this.MIN_DEPOSIT_AMOUNT) {
      const error = new BadRequestException(
        `Deposit amount must be at least ${this.MIN_DEPOSIT_AMOUNT}`,
      );
      this.logOperation(
        'warn',
        context,
        'Validation failed: amount below minimum',
      );
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Depositing ${amount} to account ${accountId}`,
      );
      const result = await this.accountsRepository.deposit(accountId, amount);

      // Моніторинг змін балансу
      this.logOperation(
        'info',
        {
          ...context,
          metadata: {
            ...context.metadata,
            newBalance: Number(result.balance),
            previousBalance: Number(result.balance) - amount,
          },
        },
        `Deposit successful. New balance: ${result.balance.toString()}`,
      );

      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async create(userId: string, currency: Currency): Promise<Account> {
    const startTime = Date.now();
    const context = {
      operation: 'create',
      module: 'accounts',
      userId,
      metadata: { currency },
    };

    // Валідація параметрів
    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
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
        `Creating account for user ${userId} with currency ${currency}`,
      );
      const result = await this.accountsRepository.create(userId, currency);
      this.logWithDuration(context, startTime, true);
      this.logOperation(
        'info',
        {
          ...context,
          metadata: {
            ...context.metadata,
            accountId: result.id,
          },
        },
        `Account created successfully: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<AccountModel[]> {
    const startTime = Date.now();
    const context = {
      operation: 'findByUserId',
      module: 'accounts',
      userId,
    };

    // Валідація параметрів
    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Fetching accounts for user ${userId}`,
      );
      const result = await this.accountsRepository.findByUserId(userId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findById(id: string): Promise<Account | null> {
    const startTime = Date.now();
    const context = {
      operation: 'findById',
      module: 'accounts',
      metadata: { accountId: id },
    };

    // Валідація параметрів
    if (!id || typeof id !== 'string') {
      const error = new BadRequestException('Invalid account id parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid account id',
      );
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching account ${id}`);
      const result = await this.accountsRepository.findById(id);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async userAccountCount(userId: string): Promise<number> {
    const startTime = Date.now();
    const context = {
      operation: 'userAccountCount',
      module: 'accounts',
      userId,
    };

    // Валідація параметрів
    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Counting accounts for user ${userId}`,
      );
      const result = await this.accountsRepository.userAccountCount(userId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async existingAccountInCurrency(
    userId: string,
    currency: Currency,
  ): Promise<Account | null> {
    const startTime = Date.now();
    const context = {
      operation: 'existingAccountInCurrency',
      module: 'accounts',
      userId,
      metadata: { currency },
    };

    // Валідація параметрів
    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
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
        `Checking existing account in ${currency} for user ${userId}`,
      );
      const result = await this.accountsRepository.existingAccountInCurrency(
        userId,
        currency,
      );
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }
}
