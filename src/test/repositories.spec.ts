import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsRepository } from 'src/modules/transactions/transactions.repository';
import { AccountsRepository } from 'src/modules/accounts/accounts.repository';
import { CardsRepository } from 'src/modules/cards/cards.repository';
import { PrismaService } from 'prisma/prisma.service';
import { CardType, Currency, PaymentSystem } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

type MockPrismaService = {
  transaction: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
  };
  account: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  card: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('Repositories (без Proxy)', () => {
  let transactionsRepository: TransactionsRepository;
  let accountsRepository: AccountsRepository;
  let cardsRepository: CardsRepository;
  let prismaService: MockPrismaService;

  beforeEach(async () => {
    const mockPrismaService: MockPrismaService = {
      transaction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      account: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      card: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsRepository,
        AccountsRepository,
        CardsRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    transactionsRepository = module.get<TransactionsRepository>(
      TransactionsRepository,
    );
    accountsRepository = module.get<AccountsRepository>(AccountsRepository);
    cardsRepository = module.get<CardsRepository>(CardsRepository);
    prismaService = module.get<MockPrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TransactionsRepository', () => {
    describe('getAllTransactions', () => {
      it('повинен повернути всі транзакції', async () => {
        const mockTransactions = [
          {
            id: '1',
            amount: 100,
            currency: Currency.UAH,
            description: 'Test',
            fromCard: { cardNumber: '1234567890123456' },
            toCard: { cardNumber: '6543210987654321' },
            createdAt: new Date(),
          },
        ];

        prismaService.transaction.findMany.mockResolvedValue(mockTransactions);

        const result = await transactionsRepository.getAllTransactions();

        expect(prismaService.transaction.findMany).toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('1');
        expect(result[0].amount).toBe(100);
        expect(result[0].fromCardNumber).toBe('1234567890123456');
      });

      it('повинен повернути порожній масив, якщо транзакцій немає', async () => {
        prismaService.transaction.findMany.mockResolvedValue([]);

        const result = await transactionsRepository.getAllTransactions();

        expect(result).toEqual([]);
      });
    });

    describe('getTransactionsByCardId', () => {
      it('повинен повернути транзакції за cardId', async () => {
        const cardId = 'card-123';
        const mockTransactions = [
          {
            id: '1',
            amount: 100,
            currency: Currency.UAH,
            fromCard: { cardNumber: '1234' },
            toCard: { cardNumber: '5678' },
            createdAt: new Date(),
          },
        ];

        prismaService.transaction.findMany.mockResolvedValue(mockTransactions);

        const result =
          await transactionsRepository.getTransactionsByCardId(cardId);

        expect(prismaService.transaction.findMany).toHaveBeenCalledWith({
          where: {
            OR: [{ fromCardId: cardId }, { toCardId: cardId }],
          },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result).toHaveLength(1);
      });
    });

    describe('getTransactionById', () => {
      it('повинен повернути транзакцію за id', async () => {
        const transactionId = 'trans-123';
        const mockTransaction = {
          id: transactionId,
          amount: 100,
          currency: Currency.UAH,
          fromCard: { cardNumber: '1234' },
          toCard: { cardNumber: '5678' },
          createdAt: new Date(),
        };

        prismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

        const result =
          await transactionsRepository.getTransactionById(transactionId);

        expect(prismaService.transaction.findUnique).toHaveBeenCalledWith({
          where: { id: transactionId },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result.id).toBe(transactionId);
      });

      it('повинен викинути NotFoundException, якщо транзакція не знайдена', async () => {
        prismaService.transaction.findUnique.mockResolvedValue(null);

        await expect(
          transactionsRepository.getTransactionById('non-existent'),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('executeTransaction', () => {
      it('повинен виконати транзакцію з оновленням балансів', async () => {
        const fromCard = {
          id: 'card1',
          cardNumber: '1234567890123456',
          accountId: 'acc1',
          account: {
            id: 'acc1',
            balance: new Decimal(1000),
            currency: Currency.UAH,
            userId: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.VISA,
          expiryDate: new Date(),
          hashedCvv: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const toCard = {
          id: 'card2',
          cardNumber: '6543210987654321',
          accountId: 'acc2',
          account: {
            id: 'acc2',
            balance: new Decimal(500),
            currency: Currency.UAH,
            userId: 'user2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.VISA,
          expiryDate: new Date(),
          hashedCvv: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const mockTransaction = {
          id: 'trans1',
          amount: 100,
          currency: Currency.UAH,
          fromCard: { cardNumber: '1234' },
          toCard: { cardNumber: '5678' },
          createdAt: new Date(),
        };

        prismaService.$transaction.mockImplementation(
          async (
            callback: (prisma: {
              account: { update: jest.Mock };
              transaction: { create: jest.Mock };
            }) => Promise<unknown>,
          ) => {
            const mockPrisma = {
              account: {
                update: jest.fn().mockResolvedValue({}),
              },
              transaction: {
                create: jest.fn().mockResolvedValue(mockTransaction),
              },
            };
            return await callback(mockPrisma);
          },
        );

        const result = await transactionsRepository.executeTransaction(
          fromCard,
          toCard,
          100,
          Currency.UAH,
          'Test',
        );

        expect(prismaService.$transaction).toHaveBeenCalled();
        expect(result.id).toBe('trans1');
        expect(result.amount).toBe(100);
      });
    });
  });

  describe('AccountsRepository', () => {
    describe('create', () => {
      it('повинен створити новий рахунок', async () => {
        const userId = 'user-123';
        const currency = Currency.UAH;
        const mockAccount = {
          id: 'acc-123',
          balance: 0,
          currency,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.account.create.mockResolvedValue(mockAccount);

        const result = await accountsRepository.create(userId, currency);

        expect(prismaService.account.create).toHaveBeenCalledWith({
          data: {
            userId,
            currency,
            balance: 0,
          },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result.id).toBe('acc-123');
        expect(result.balance).toBe(0);
        expect(result.currency).toBe(currency);
      });
    });

    describe('deposit', () => {
      it('повинен збільшити баланс рахунку', async () => {
        const accountId = 'acc-123';
        const amount = 1000;
        const mockAccount = {
          id: accountId,
          balance: 1000,
          currency: Currency.UAH,
        };

        prismaService.account.update.mockResolvedValue(mockAccount);

        const result = await accountsRepository.deposit(accountId, amount);

        expect(prismaService.account.update).toHaveBeenCalledWith({
          where: { id: accountId },
          data: {
            balance: {
              increment: amount,
            },
          },
        });
        expect(result.balance).toBe(1000);
      });
    });

    describe('findById', () => {
      it('повинен повернути рахунок за id', async () => {
        const accountId = 'acc-123';
        const mockAccount = {
          id: accountId,
          balance: 1000,
          currency: Currency.UAH,
          userId: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          User: {
            id: 'user-123',
            email: 'test@example.com',
            fullName: 'Test User',
          },
        };

        prismaService.account.findUnique.mockResolvedValue(mockAccount);

        const result = await accountsRepository.findById(accountId);

        expect(prismaService.account.findUnique).toHaveBeenCalledWith({
          where: { id: accountId },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result?.id).toBe(accountId);
      });

      it('повинен повернути null, якщо рахунок не знайдено', async () => {
        prismaService.account.findUnique.mockResolvedValue(null);

        const result = await accountsRepository.findById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('findByUserId', () => {
      it('повинен повернути всі рахунки користувача', async () => {
        const userId = 'user-123';
        const mockAccounts = [
          {
            id: 'acc-1',
            balance: 1000,
            currency: Currency.UAH,
            cards: [],
          },
          {
            id: 'acc-2',
            balance: 500,
            currency: Currency.USD,
            cards: [],
          },
        ];

        prismaService.account.findMany.mockResolvedValue(mockAccounts);

        const result = await accountsRepository.findByUserId(userId);

        expect(prismaService.account.findMany).toHaveBeenCalledWith({
          where: { userId },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result).toHaveLength(2);
      });
    });

    describe('userAccountCount', () => {
      it('повинен повернути кількість рахунків користувача', async () => {
        const userId = 'user-123';
        prismaService.account.count.mockResolvedValue(3);

        const result = await accountsRepository.userAccountCount(userId);

        expect(prismaService.account.count).toHaveBeenCalledWith({
          where: { userId },
        });
        expect(result).toBe(3);
      });
    });
  });

  describe('CardsRepository', () => {
    describe('create', () => {
      it('повинен створити нову картку', async () => {
        const accountId = 'acc-123';
        const cardType = CardType.DEBIT;
        const paymentSystem = PaymentSystem.VISA;
        const mockCard = {
          id: 'card-123',
          cardNumber: '4123456789012345',
          cardType,
          paymentSystem,
          accountId,
          expiryDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.card.create.mockResolvedValue(mockCard);

        const result = await cardsRepository.create(
          accountId,
          cardType,
          paymentSystem,
        );

        expect(prismaService.card.create).toHaveBeenCalled();
        expect(result.id).toBe('card-123');
        expect(result.cardType).toBe(cardType);
        expect(result.paymentSystem).toBe(paymentSystem);
        expect(result.cardNumber).toMatch(/^4/);
      });
    });

    describe('findById', () => {
      it('повинен повернути картку за id', async () => {
        const cardId = 'card-123';
        const mockCard = {
          id: cardId,
          cardNumber: '4123456789012345',
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.VISA,
          accountId: 'acc-123',
          expiryDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.card.findUnique.mockResolvedValue(mockCard);

        const result = await cardsRepository.findById(cardId);

        expect(prismaService.card.findUnique).toHaveBeenCalledWith({
          where: { id: cardId },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result?.id).toBe(cardId);
      });

      it('повинен повернути null, якщо картка не знайдена', async () => {
        prismaService.card.findUnique.mockResolvedValue(null);

        const result = await cardsRepository.findById('non-existent');

        expect(result).toBeNull();
      });
    });

    describe('findByCardNumber', () => {
      it('повинен повернути картку за номером', async () => {
        const cardNumber = '4123456789012345';
        const mockCard = {
          id: 'card-123',
          cardNumber,
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.VISA,
          accountId: 'acc-123',
          expiryDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        prismaService.card.findUnique.mockResolvedValue(mockCard);

        const result = await cardsRepository.findByCardNumber(cardNumber);

        expect(prismaService.card.findUnique).toHaveBeenCalledWith({
          where: { cardNumber },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result?.cardNumber).toBe(cardNumber);
      });
    });

    describe('findByAccountId', () => {
      it('повинен повернути всі карти рахунку', async () => {
        const accountId = 'acc-123';
        const mockCards = [
          {
            id: 'card-1',
            cardNumber: '4123456789012345',
            cardType: CardType.DEBIT,
            paymentSystem: PaymentSystem.VISA,
            accountId,
            expiryDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        prismaService.card.findMany.mockResolvedValue(mockCards);

        const result = await cardsRepository.findByAccountId(accountId);

        expect(prismaService.card.findMany).toHaveBeenCalledWith({
          where: { accountId },
          select: expect.any(Object) as Record<string, unknown>,
        });
        expect(result).toHaveLength(1);
      });
    });

    describe('countCardsByAccountId', () => {
      it('повинен повернути кількість карток рахунку', async () => {
        const accountId = 'acc-123';
        prismaService.card.count.mockResolvedValue(2);

        const result = await cardsRepository.countCardsByAccountId(accountId);

        expect(prismaService.card.count).toHaveBeenCalledWith({
          where: { accountId },
        });
        expect(result).toBe(2);
      });
    });

    describe('deleteByAccountId', () => {
      it('повинен видалити всі карти рахунку та транзакції', async () => {
        const accountId = 'acc-123';
        prismaService.transaction.deleteMany.mockResolvedValue({ count: 5 });
        prismaService.card.deleteMany.mockResolvedValue({ count: 3 });

        const result = await cardsRepository.deleteByAccountId(accountId);

        expect(prismaService.transaction.deleteMany).toHaveBeenCalled();
        expect(prismaService.card.deleteMany).toHaveBeenCalledWith({
          where: { accountId },
        });
        expect(result.deletedCount).toBe(3);
      });
    });
  });
});
