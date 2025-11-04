import { CardType, PaymentSystem } from '@prisma/client';

export class CardDto {
  id: string;
  cardNumber: string;
  paymentSystem: PaymentSystem;
  cardType: CardType;
  expiryDate: Date;
  accountId: string;
  createdAt: Date;
  updatedAt: Date;
}
