import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CardsRepository } from './cards.repository';
import { CardType, PaymentSystem } from '@prisma/client';
import { CardDto } from './dto/card.dto';
import { AuthRepository } from '../auth/auth.repository';
import * as bcrypt from 'bcrypt';
import { decryptCvv } from 'src/common/utils/crypto.util';
import { CardWithCvvDto } from './dto/card-with-cvv.dto';

@Injectable()
export class CardsService {
  constructor(
    private readonly cardRepository: CardsRepository,
    private readonly authRepository: AuthRepository,
  ) {}

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

  async deleteCardsByAccountId(
    accountId: string,
  ): Promise<{ deletedCount: number }> {
    return this.cardRepository.deleteByAccountId(accountId);
  }

  async getCvvForCard(
    cardId: string,
    password: string,
    userId: string,
  ): Promise<CardWithCvvDto> {
    const card = await this.cardRepository.findByIdWithHashedCvv(cardId);

    if (!card) {
      throw new NotFoundException('Card not found');
    }
    if (card.account.userId !== userId) {
      throw new ForbiddenException('You can only access CVV of your own cards');
    }
    const userWithRefreshToken =
      await this.authRepository.findByIdWithRefreshToken(userId);
    if (!userWithRefreshToken) {
      throw new NotFoundException('User not found');
    }

    const user = await this.authRepository.findByEmailWithPassword(
      userWithRefreshToken.email,
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new ForbiddenException('Invalid password');
    }
    let cvv: string;
    try {
      cvv = decryptCvv(card.hashedCvv!);
    } catch (error) {
      throw new ForbiddenException(error);
    }

    return {
      accountId: card.account.id,
      cardNumber: card.cardNumber,
      expiryDate: card.expiryDate,
      cvv: cvv,
    };
  }
}
