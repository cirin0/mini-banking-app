import { ForbiddenException, Injectable } from '@nestjs/common';
import { CardsRepository } from './cards.repository';
import { CardType, PaymentSystem } from '@prisma/client';
import { CardDto } from './dto/card.dto';

@Injectable()
export class CardsService {
  constructor(private readonly cardRepository: CardsRepository) {}

  private readonly CARD_LIMIT = 3;

  async createCardForAccount(
    accountId: string,
    cardType: CardType,
    paymentSystem: PaymentSystem,
  ): Promise<CardDto> {
    const existingCardCount =
      await this.cardRepository.countCardsByAccountId(accountId);
    if (existingCardCount >= this.CARD_LIMIT) {
      throw new ForbiddenException(
        `Card limit reached. You can have a maximum of ${this.CARD_LIMIT} cards per account.`,
      );
    }

    return this.cardRepository.create(accountId, cardType, paymentSystem);
  }

  async getCardById(cardId: string): Promise<CardDto | null> {
    return this.cardRepository.findById(cardId);
  }

  async getCardsByAccountId(accountId: string): Promise<CardDto[]> {
    return this.cardRepository.findByAccountId(accountId);
  }

  async getCardByNumber(cardNumber: string): Promise<CardDto | null> {
    return this.cardRepository.findByCardNumber(cardNumber);
  }

  async getCardsByUserId(userId: string): Promise<CardDto[]> {
    return this.cardRepository.findByUserId(userId);
  }
}
