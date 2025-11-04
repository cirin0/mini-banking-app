import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionsRepository } from './transactions.repository';
import { TransactionDto } from './dto/transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly transactionRepository: TransactionsRepository) {}

  async createTransaction(
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionDto> {
    const { fromCardNumber, toCardNumber, amount, currency, description } =
      createTransactionDto;

    const fromCard =
      await this.transactionRepository.getCardWithAccount(fromCardNumber);

    const toCard =
      await this.transactionRepository.getCardWithAccount(toCardNumber);

    if (!fromCard) {
      throw new NotFoundException(
        `Card with number ${fromCardNumber} not found`,
      );
    }

    if (!toCard) {
      throw new NotFoundException(`Card with number ${toCardNumber} not found`);
    }

    if (!fromCard.account || !toCard.account) {
      throw new BadRequestException('Both cards must be linked to accounts');
    }

    if (fromCard.account.balance.lt(amount)) {
      throw new BadRequestException('Insufficient funds for this transaction');
    }

    if (amount < 0.1) {
      throw new BadRequestException('Amount must be at least 0.1');
    }

    if (
      fromCard.account.currency !== currency ||
      toCard.account.currency !== currency
    ) {
      throw new BadRequestException(
        `Currency mismatch. Both accounts must support ${currency}`,
      );
    }

    return this.transactionRepository.executeTransaction(
      fromCard,
      toCard,
      amount,
      currency,
      description,
    );
  }

  async getAllTransactions(): Promise<TransactionDto[]> {
    return this.transactionRepository.getAllTransactions();
  }

  async getTransactionById(id: string): Promise<TransactionDto> {
    return this.transactionRepository.getTransactionById(id);
  }

  async getTransactionsByCardId(cardId: string): Promise<TransactionDto[]> {
    return this.transactionRepository.getTransactionsByCardId(cardId);
  }

  async getTransactionsByCardNumber(
    cardNumber: string,
  ): Promise<TransactionDto[]> {
    return this.transactionRepository.getTransactionsByCardNumber(cardNumber);
  }
}
