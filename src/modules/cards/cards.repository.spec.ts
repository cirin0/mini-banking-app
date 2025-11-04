import { Test, TestingModule } from '@nestjs/testing';
import { CardsRepository } from './cards.repository';
import { PrismaService } from 'prisma/prisma.service';
import { CardType, PaymentSystem } from '@prisma/client';
import { validateCardNumber } from 'src/common/utils/card-validator.util';

describe('CardsRepository Integration', () => {
  let repository: CardsRepository;

  const mockPrismaService = {
    card: {
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<CardsRepository>(CardsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should generate valid VISA card number', async () => {
      const mockAccountId = 'account-123';
      const cardType = CardType.DEBIT;
      const paymentSystem = PaymentSystem.VISA;

      mockPrismaService.card.create.mockImplementation(({ data }) => {
        return Promise.resolve({
          ...data,
          id: 'card-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await repository.create(
        mockAccountId,
        cardType,
        paymentSystem,
      );

      expect(result.cardNumber).toBeDefined();
      expect(result.cardNumber).toHaveLength(16);
      expect(result.cardNumber.startsWith('4')).toBe(true);
      expect(validateCardNumber(result.cardNumber, PaymentSystem.VISA)).toBe(
        true,
      );
    });

    it('should generate valid MASTERCARD number', async () => {
      const mockAccountId = 'account-456';
      const cardType = CardType.CREDIT;
      const paymentSystem = PaymentSystem.MASTERCARD;

      mockPrismaService.card.create.mockImplementation(({ data }) => {
        return Promise.resolve({
          ...data,
          id: 'card-456',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      const result = await repository.create(
        mockAccountId,
        cardType,
        paymentSystem,
      );

      expect(result.cardNumber).toBeDefined();
      expect(result.cardNumber).toHaveLength(16);
      expect(result.cardNumber.startsWith('5')).toBe(true);
      expect(
        validateCardNumber(result.cardNumber, PaymentSystem.MASTERCARD),
      ).toBe(true);
    });

    it('should generate unique card numbers', async () => {
      const mockAccountId = 'account-789';
      const cardType = CardType.DEBIT;
      const paymentSystem = PaymentSystem.VISA;

      const cardNumbers = new Set<string>();

      mockPrismaService.card.create.mockImplementation(
        ({ data }: { data: { cardNumber: string } }) => {
          cardNumbers.add(data.cardNumber);
          return Promise.resolve({
            ...data,
            id: `card-${cardNumbers.size}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        },
      );

      // Generate 10 cards
      for (let i = 0; i < 10; i++) {
        await repository.create(mockAccountId, cardType, paymentSystem);
      }

      // All should be unique
      expect(cardNumbers.size).toBe(10);

      // All should be valid
      cardNumbers.forEach((cardNumber) => {
        expect(validateCardNumber(cardNumber, paymentSystem)).toBe(true);
      });
    });

    it('should set expiry date to 3 years from now', async () => {
      const mockAccountId = 'account-999';
      const cardType = CardType.DEBIT;
      const paymentSystem = PaymentSystem.VISA;

      let capturedExpiryDate: Date | undefined;

      mockPrismaService.card.create.mockImplementation(
        ({ data }: { data: { expiryDate: Date } }) => {
          capturedExpiryDate = data.expiryDate;
          return Promise.resolve({
            ...data,
            id: 'card-999',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        },
      );

      await repository.create(mockAccountId, cardType, paymentSystem);

      const threeYearsFromNow = new Date();
      threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);

      expect(capturedExpiryDate).toBeDefined();
      if (capturedExpiryDate) {
        expect(capturedExpiryDate.getFullYear()).toBe(
          threeYearsFromNow.getFullYear(),
        );
      }
    });
  });

  describe('countCardsByAccountId', () => {
    it('should return card count for account', async () => {
      const mockAccountId = 'account-123';
      mockPrismaService.card.count.mockResolvedValue(2);

      const result = await repository.countCardsByAccountId(mockAccountId);

      expect(result).toBe(2);
      expect(mockPrismaService.card.count).toHaveBeenCalledWith({
        where: { accountId: mockAccountId },
      });
    });
  });
});
