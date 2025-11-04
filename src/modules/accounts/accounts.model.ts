import { Card } from '../cards/cards.model';
import { Decimal } from '@prisma/client/runtime/library';

export class Account {
  id: string;
  balance: Decimal;
  currency: string;
  cards?: Card[];
}
