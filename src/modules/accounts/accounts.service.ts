import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountsRepository } from './accounts.repository';
import { Account, Currency } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly accountsRepository: AccountsRepository) {}

  private readonly ACCOUNT_LIMIT = 3;

  async createAccountForUser(
    userId: string,
    currency: Currency = Currency.UAH,
  ): Promise<Account> {
    const userAccountsCount =
      await this.accountsRepository.userAccountCount(userId);

    if (userAccountsCount >= this.ACCOUNT_LIMIT) {
      throw new ForbiddenException(
        `Account limit reached. You can have a maximum of ${this.ACCOUNT_LIMIT} accounts.`,
      );
    }
    const existingAccountInCurrency =
      await this.accountsRepository.existingAccountInCurrency(userId, currency);

    if (existingAccountInCurrency) {
      throw new ForbiddenException(
        `You already have an account in ${currency}.`,
      );
    }
    return this.accountsRepository.create(userId, currency);
  }

  async getUserAccounts(userId: string): Promise<Account[]> {
    return this.accountsRepository.findByUserId(userId);
  }

  async getAccountById(id: string): Promise<Account> {
    const account = await this.accountsRepository.findById(id);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async depositToAccount(accountId: string, amount: number, userId: string) {
    const account = await this.getAccountById(accountId);
    if (account.userId !== userId) {
      throw new ForbiddenException(
        `You do not have permission to deposit to this account.`,
      );
    }
    const updatedAccount = await this.accountsRepository.deposit(
      accountId,
      amount,
    );
    return {
      message: 'Deposit successful',
      balance: updatedAccount.balance,
    };
  }
}
