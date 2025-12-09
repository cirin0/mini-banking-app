import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { AccountsService } from '../../modules/accounts/accounts.service';
import { Account, Currency } from '@prisma/client';
import { Account as AccountModel } from '../../modules/accounts/accounts.model';
import { BaseLoggerProxy } from './base-logger.proxy';
import { MonitoringService } from '../monitoring/monitoring.service';

@Injectable()
export class AccountsServiceProxy extends BaseLoggerProxy {
  constructor(
    private readonly accountsService: AccountsService,
    @Optional() @Inject(MonitoringService) monitoringService?: MonitoringService,
  ) {
    super('AccountsService', monitoringService);
  }

  async createAccountForUser(
    userId: string,
    currency: Currency = Currency.UAH,
  ): Promise<Account> {
    const startTime = Date.now();
    const context = {
      operation: 'createAccountForUser',
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
      this.logOperation('info', context, `Creating account for user ${userId} with currency ${currency}`);
      const result = await this.accountsService.createAccountForUser(userId, currency);
      
      // Моніторинг створення рахунків
      this.logOperation('info', {
        ...context,
        metadata: {
          ...context.metadata,
          accountId: result.id,
          success: true,
        },
      }, `Account created successfully: ${result.id}`);
      
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      // Логування помилок валідації лімітів
      if (error instanceof ForbiddenException) {
        this.logOperation('warn', {
          ...context,
          metadata: {
            ...context.metadata,
            validationError: error.message,
          },
        }, `Account creation failed: ${error.message}`);
      }
      
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getUserAccounts(userId: string): Promise<AccountModel[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getUserAccounts',
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
      this.logOperation('info', context, `Fetching accounts for user ${userId}`);
      const result = await this.accountsService.getUserAccounts(userId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getAccountById(id: string): Promise<Account> {
    const startTime = Date.now();
    const context = {
      operation: 'getAccountById',
      module: 'accounts',
      metadata: { accountId: id },
    };

    // Валідація параметрів
    if (!id || typeof id !== 'string') {
      const error = new BadRequestException('Invalid account id parameter');
      this.logOperation('warn', context, 'Validation failed: invalid account id');
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching account ${id}`);
      const result = await this.accountsService.getAccountById(id);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async depositToAccount(
    accountId: string,
    amount: number,
    userId: string,
  ): Promise<{ message: string; balance: any }> {
    const startTime = Date.now();
    const context = {
      operation: 'depositToAccount',
      module: 'accounts',
      userId,
      metadata: {
        accountId,
        amount,
      },
    };

    // Валідація параметрів
    if (!accountId || typeof accountId !== 'string') {
      const error = new BadRequestException('Invalid accountId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid accountId');
      throw error;
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      const error = new BadRequestException('Invalid amount parameter');
      this.logOperation('warn', context, 'Validation failed: invalid amount');
      throw error;
    }

    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
      throw error;
    }

    try {
      this.logOperation('info', context, `Depositing ${amount} to account ${accountId} by user ${userId}`);
      const result = await this.accountsService.depositToAccount(
        accountId,
        amount,
        userId,
      );
      
      // Моніторинг операцій депозиту
      this.logOperation('info', {
        ...context,
        metadata: {
          ...context.metadata,
          newBalance: Number(result.balance),
          success: true,
        },
      }, `Deposit successful. New balance: ${result.balance}`);
      
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      // Логування помилок безпеки
      if (error instanceof ForbiddenException) {
        this.logOperation('warn', {
          ...context,
          metadata: {
            ...context.metadata,
            securityError: error.message,
          },
        }, `Security check failed: ${error.message}`);
      }
      
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }
}

