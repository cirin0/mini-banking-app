import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { CardsService } from '../../modules/cards/cards.service';
import { CardType, PaymentSystem } from '@prisma/client';
import { CardDto } from '../../modules/cards/dto/card.dto';
import { CardWithCvvDto } from '../../modules/cards/dto/card-with-cvv.dto';
import { BaseLoggerProxy } from './base-logger.proxy';
import { MonitoringService } from 'src/modules/monitoring/monitoring.service';

@Injectable()
export class CardsServiceProxy extends BaseLoggerProxy {
  constructor(
    private readonly cardsService: CardsService,
    @Optional()
    @Inject(MonitoringService)
    monitoringService?: MonitoringService,
  ) {
    super('CardsService', monitoringService);
  }

  async createCardForAccount(
    accountId: string,
    cardType: CardType,
    paymentSystem: PaymentSystem,
  ): Promise<CardDto> {
    const startTime = Date.now();
    const context = {
      operation: 'createCardForAccount',
      module: 'cards',
      metadata: {
        accountId,
        cardType,
        paymentSystem,
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

    if (!cardType || typeof cardType !== 'string') {
      const error = new BadRequestException('Invalid cardType parameter');
      this.logOperation('warn', context, 'Validation failed: invalid cardType');
      throw error;
    }

    if (!paymentSystem || typeof paymentSystem !== 'string') {
      const error = new BadRequestException('Invalid paymentSystem parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid paymentSystem',
      );
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Creating card for account ${accountId}`,
      );
      const result = await this.cardsService.createCardForAccount(
        accountId,
        cardType,
        paymentSystem,
      );
      this.logWithDuration(context, startTime, true);
      this.logOperation(
        'info',
        {
          ...context,
          metadata: {
            ...context.metadata,
            cardId: result.id,
            cardNumber: this.maskCardNumber(result.cardNumber),
          },
        },
        `Card created successfully: ${result.id}`,
      );
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCardById(cardId: string): Promise<CardDto | null> {
    const startTime = Date.now();
    const context = {
      operation: 'getCardById',
      module: 'cards',
      metadata: { cardId },
    };

    // Валідація параметрів
    if (!cardId || typeof cardId !== 'string') {
      const error = new BadRequestException('Invalid cardId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid cardId');
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching card ${cardId}`);
      const result = await this.cardsService.getCardById(cardId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCardsByAccountId(accountId: string): Promise<CardDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getCardsByAccountId',
      module: 'cards',
      metadata: { accountId },
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

    try {
      this.logOperation(
        'info',
        context,
        `Fetching cards for account ${accountId}`,
      );
      const result = await this.cardsService.getCardsByAccountId(accountId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCardByNumber(cardNumber: string): Promise<CardDto | null> {
    const startTime = Date.now();
    const context = {
      operation: 'getCardByNumber',
      module: 'cards',
      metadata: { cardNumber: this.maskCardNumber(cardNumber) },
    };

    // Валідація параметрів
    if (!cardNumber || typeof cardNumber !== 'string') {
      const error = new BadRequestException('Invalid cardNumber parameter');
      this.logOperation(
        'warn',
        context,
        'Validation failed: invalid cardNumber',
      );
      throw error;
    }

    try {
      this.logOperation(
        'info',
        context,
        `Fetching card by number ${this.maskCardNumber(cardNumber)}`,
      );
      const result = await this.cardsService.getCardByNumber(cardNumber);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCardsByUserId(userId: string): Promise<CardDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'getCardsByUserId',
      module: 'cards',
      userId,
    };

    // Валідація параметрів
    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
      throw error;
    }

    try {
      this.logOperation('info', context, `Fetching cards for user ${userId}`);
      const result = await this.cardsService.getCardsByUserId(userId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async deleteCardsByAccountId(
    accountId: string,
  ): Promise<{ deletedCount: number }> {
    const startTime = Date.now();
    const context = {
      operation: 'deleteCardsByAccountId',
      module: 'cards',
      metadata: { accountId },
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

    try {
      this.logOperation(
        'info',
        context,
        `Deleting cards for account ${accountId}`,
      );
      const result = await this.cardsService.deleteCardsByAccountId(accountId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async getCvvForCard(
    cardId: string,
    password: string,
    userId: string,
  ): Promise<CardWithCvvDto> {
    const startTime = Date.now();
    const context = {
      operation: 'getCvvForCard',
      module: 'cards',
      userId,
      metadata: { cardId },
    };

    // Валідація параметрів
    if (!cardId || typeof cardId !== 'string') {
      const error = new BadRequestException('Invalid cardId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid cardId');
      throw error;
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      const error = new BadRequestException('Invalid password parameter');
      this.logOperation('warn', context, 'Validation failed: invalid password');
      throw error;
    }

    if (!userId || typeof userId !== 'string') {
      const error = new BadRequestException('Invalid userId parameter');
      this.logOperation('warn', context, 'Validation failed: invalid userId');
      throw error;
    }

    // Безпека: додаткове логування спроби доступу до CVV
    this.logOperation(
      'warn',
      {
        ...context,
        metadata: {
          ...context.metadata,
          securityEvent: 'CVV_ACCESS_ATTEMPT',
        },
      },
      `SECURITY: Attempting to access CVV for card ${cardId} by user ${userId}`,
    );

    try {
      const result = await this.cardsService.getCvvForCard(
        cardId,
        password,
        userId,
      );

      // Безпека: логування успішного доступу до CVV
      this.logOperation(
        'warn',
        {
          ...context,
          metadata: {
            ...context.metadata,
            securityEvent: 'CVV_ACCESS_SUCCESS',
            cardNumber: this.maskCardNumber(result.cardNumber),
          },
        },
        `SECURITY: CVV accessed successfully for card ${this.maskCardNumber(result.cardNumber)} by user ${userId}`,
      );

      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      // Безпека: логування невдалої спроби доступу
      if (error instanceof ForbiddenException) {
        this.logOperation(
          'warn',
          {
            ...context,
            metadata: {
              ...context.metadata,
              securityEvent: 'CVV_ACCESS_DENIED',
              reason: error.message,
            },
          },
          `SECURITY: CVV access denied for card ${cardId} by user ${userId}`,
        );
      }

      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  private maskCardNumber(cardNumber: string): string {
    if (!cardNumber || cardNumber.length < 4) {
      return '****';
    }
    return '****' + cardNumber.slice(-4);
  }
}
