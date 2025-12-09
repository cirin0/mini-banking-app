import {
  Injectable,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { CardsRepository } from '../../modules/cards/cards.repository';
import { CardType, PaymentSystem } from '@prisma/client';
import { CardDto } from '../../modules/cards/dto/card.dto';
import { BaseLoggerProxy } from './base-logger.proxy';
import { MonitoringService } from 'src/modules/monitoring/monitoring.service';

@Injectable()
export class CardsRepositoryProxy extends BaseLoggerProxy {
  constructor(
    private readonly cardsRepository: CardsRepository,
    @Optional()
    @Inject(MonitoringService)
    monitoringService?: MonitoringService,
  ) {
    super('CardsRepository', monitoringService);
  }

  async create(
    accountId: string,
    cardType: CardType,
    paymentSystem: PaymentSystem,
  ): Promise<CardDto> {
    const startTime = Date.now();
    const context = {
      operation: 'create',
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
      const result = await this.cardsRepository.create(
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

  async countCardsByAccountId(accountId: string): Promise<number> {
    const startTime = Date.now();
    const context = {
      operation: 'countCardsByAccountId',
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
        `Counting cards for account ${accountId}`,
      );
      const result =
        await this.cardsRepository.countCardsByAccountId(accountId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findById(cardId: string): Promise<CardDto | null> {
    const startTime = Date.now();
    const context = {
      operation: 'findById',
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
      const result = await this.cardsRepository.findById(cardId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findByAccountId(accountId: string): Promise<CardDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'findByAccountId',
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
      const result = await this.cardsRepository.findByAccountId(accountId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findByCardNumber(cardNumber: string): Promise<CardDto | null> {
    const startTime = Date.now();
    const context = {
      operation: 'findByCardNumber',
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
      const result = await this.cardsRepository.findByCardNumber(cardNumber);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<CardDto[]> {
    const startTime = Date.now();
    const context = {
      operation: 'findByUserId',
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
      const result = await this.cardsRepository.findByUserId(userId);
      this.logWithDuration(context, startTime, true);
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async deleteByAccountId(
    accountId: string,
  ): Promise<{ deletedCount: number }> {
    const startTime = Date.now();
    const context = {
      operation: 'deleteByAccountId',
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
      const result = await this.cardsRepository.deleteByAccountId(accountId);
      this.logWithDuration(context, startTime, true);
      this.logOperation(
        'info',
        {
          ...context,
          metadata: {
            ...context.metadata,
            deletedCount: result.deletedCount,
          },
        },
        `Deleted ${result.deletedCount} cards`,
      );
      return result;
    } catch (error) {
      this.logWithDuration(context, startTime, false, error as Error);
      throw error;
    }
  }

  async findByIdWithHashedCvv(cardId: string): Promise<{
    hashedCvv: string | null;
    cardNumber: string;
    expiryDate: Date;
    account: { id: string; userId: string };
  } | null> {
    const startTime = Date.now();
    const context = {
      operation: 'findByIdWithHashedCvv',
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
      // Безпека: логування спроби доступу до чутливих даних
      this.logOperation(
        'warn',
        context,
        `SECURITY: Attempting to access CVV for card ${cardId}`,
      );
      const result = await this.cardsRepository.findByIdWithHashedCvv(cardId);
      this.logWithDuration(context, startTime, true);

      if (result) {
        this.logOperation(
          'warn',
          {
            ...context,
            metadata: {
              ...context.metadata,
              cardNumber: this.maskCardNumber(result.cardNumber),
              accountId: result.account.id,
              userId: result.account.userId,
            },
          },
          `SECURITY: CVV data accessed for card ${this.maskCardNumber(result.cardNumber)}`,
        );
      }

      return result;
    } catch (error) {
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
