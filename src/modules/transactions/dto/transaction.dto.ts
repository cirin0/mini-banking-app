import { Currency } from '@prisma/client';

export class TransactionDto {
  id: string;
  toCardNumber: string;
  fromCardNumber: string;
  amount: number;
  currency: Currency;
  description?: string;
  createdAt: Date;
}
