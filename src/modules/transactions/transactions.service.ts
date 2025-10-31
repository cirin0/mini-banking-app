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
    console.log(fromCard);

    const toCard =
      await this.transactionRepository.getCardWithAccount(toCardNumber);

    console.log(toCard);

    if (!fromCard) {
      throw new NotFoundException(
        `Card with number ${fromCardNumber} not found`,
      );
    }

    if (!toCard) {
      throw new NotFoundException(`Card with number ${toCardNumber} not found`);
    }

    if (Number(fromCard.account.balance) < amount) {
      throw new BadRequestException('Insufficient funds for this transaction');
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

  async getTransactionById(id: string): Promise<TransactionDto | null> {
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
