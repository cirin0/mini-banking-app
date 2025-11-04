import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';
import { PrismaService } from 'prisma/prisma.service';
import { CardType, Currency, PaymentSystem } from '@prisma/client';

interface UserResponse {
  id: string;
  email: string;
  fullName: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

interface AccountResponse {
  id: string;
  balance: string | number;
  currency: Currency;
}

interface CardResponse {
  id: string;
  cardNumber: string;
  cardType: CardType;
  paymentSystem: PaymentSystem;
}

interface TransactionResponse {
  id: string;
  fromCardNumber: string;
  toCardNumber: string;
  amount: string | number;
  currency: Currency;
  description?: string;
}

describe('Banking Flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Змінні для зберігання даних користувачів
  const user1 = {
    fullName: 'Test User One',
    email: `testuser1_${Date.now()}@example.com`,
    password: 'password123',
    accessToken: '',
    accountId: '',
    cardNumber: '',
  };

  const user2 = {
    fullName: 'Test User Two',
    email: `testuser2_${Date.now()}@example.com`,
    password: 'password456',
    accessToken: '',
    accountId: '',
    cardNumber: '',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Налаштування так само, як у main.ts
    app.setGlobalPrefix(process.env.API_PREFIX || 'api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    try {
      await prisma.transaction.deleteMany({
        where: {
          OR: [
            { fromCard: { cardNumber: user1.cardNumber } },
            { toCard: { cardNumber: user1.cardNumber } },
            { fromCard: { cardNumber: user2.cardNumber } },
            { toCard: { cardNumber: user2.cardNumber } },
          ],
        },
      });

      if (user1.cardNumber) {
        await prisma.card.deleteMany({
          where: { cardNumber: user1.cardNumber },
        });
      }
      if (user2.cardNumber) {
        await prisma.card.deleteMany({
          where: { cardNumber: user2.cardNumber },
        });
      }

      if (user1.accountId) {
        await prisma.account.deleteMany({
          where: { id: user1.accountId },
        });
      }
      if (user2.accountId) {
        await prisma.account.deleteMany({
          where: { id: user2.accountId },
        });
      }

      if (user1.email) {
        await prisma.user.deleteMany({
          where: { email: user1.email },
        });
      }
      if (user2.email) {
        await prisma.user.deleteMany({
          where: { email: user2.email },
        });
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }

    await app.close();
  });

  describe('1. Реєстрація та створення користувачів', () => {
    it('повинен зареєструвати першого користувача', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: user1.fullName,
          email: user1.email,
          password: user1.password,
        })
        .expect(201);

      const body = response.body as UserResponse;
      expect(body).toHaveProperty('id');
      expect(body.email).toBe(user1.email);
      expect(body.fullName).toBe(user1.fullName);
      expect(response.body).not.toHaveProperty('password');
    });

    it('повинен зареєструвати другого користувача', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: user2.fullName,
          email: user2.email,
          password: user2.password,
        })
        .expect(201);

      const body = response.body as UserResponse;
      expect(body).toHaveProperty('id');
      expect(body.email).toBe(user2.email);
      expect(body.fullName).toBe(user2.fullName);
    });

    it('повинен авторизувати першого користувача', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user1.email,
          password: user1.password,
        })
        .expect(201);

      const body = response.body as AuthResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      user1.accessToken = body.accessToken;
    });

    it('повинен авторизувати другого користувача', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user2.email,
          password: user2.password,
        })
        .expect(201);

      const body = response.body as AuthResponse;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
      user2.accessToken = body.accessToken;
    });
  });

  describe('2. Отримання існуючих рахунків', () => {
    it('повинен отримати список рахунків першого користувача (створених автоматично)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts/my')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as AccountResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].currency).toBe(Currency.UAH);
      // Зберігаємо ID автоматично створеного рахунку
      user1.accountId = body[0].id;
    });

    it('повинен отримати список рахунків другого користувача (створених автоматично)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/accounts/my')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const body = response.body as AccountResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      // Зберігаємо ID автоматично створеного рахунку
      user2.accountId = body[0].id;
    });

    it('повинен отримати рахунок за ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${user1.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as AccountResponse;
      expect(body.id).toBe(user1.accountId);
      expect(body.currency).toBe(Currency.UAH);
      expect(Number(body.balance)).toBe(0);
    });
  });

  describe('3. Створення карт', () => {
    it('повинен створити карту для першого користувача (VISA)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/cards/${user1.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.VISA,
        })
        .expect(201);

      const body = response.body as CardResponse;
      expect(body).toHaveProperty('cardNumber');
      expect(body.cardType).toBe(CardType.DEBIT);
      expect(body.paymentSystem).toBe(PaymentSystem.VISA);
      expect(body.cardNumber).toMatch(/^4/); // VISA починається з 4
      user1.cardNumber = body.cardNumber;
    });

    it('повинен створити карту для другого користувача (MASTERCARD)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/cards/${user2.accountId}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          cardType: CardType.DEBIT,
          paymentSystem: PaymentSystem.MASTERCARD,
        })
        .expect(201);

      const body = response.body as CardResponse;
      expect(body).toHaveProperty('cardNumber');
      expect(body.paymentSystem).toBe(PaymentSystem.MASTERCARD);
      expect(body.cardNumber).toMatch(/^5/); // MASTERCARD починається з 5
      user2.cardNumber = body.cardNumber;
    });

    it('повинен отримати карти першого користувача', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/cards/account/${user1.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as CardResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].cardNumber).toBe(user1.cardNumber);
    });
  });

  describe('4. Депозит на рахунок', () => {
    it('повинен зробити депозит на рахунок першого користувача', async () => {
      const depositAmount = 10000;
      const response = await request(app.getHttpServer())
        .post(`/api/accounts/${user1.accountId}/deposit`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          amount: depositAmount,
        })
        .expect(201);

      const body = response.body as AccountResponse;
      expect(body).toHaveProperty('balance');
      expect(Number(body.balance)).toBe(depositAmount);
    });

    it('повинен зробити депозит на рахунок другого користувача', async () => {
      const depositAmount = 5000;
      const response = await request(app.getHttpServer())
        .post(`/api/accounts/${user2.accountId}/deposit`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          amount: depositAmount,
        })
        .expect(201);

      const body = response.body as AccountResponse;
      expect(Number(body.balance)).toBe(depositAmount);
    });

    it('повинен перевірити баланс після депозиту', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${user1.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as AccountResponse;
      expect(Number(body.balance)).toBe(10000);
    });
  });

  describe('5. Транзакції між картами', () => {
    it('повинен здійснити переказ від користувача 1 до користувача 2 (1000 UAH)', async () => {
      const transferAmount = 1000;
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          fromCardNumber: user1.cardNumber,
          toCardNumber: user2.cardNumber,
          amount: transferAmount,
          currency: Currency.UAH,
          description: 'Тестовий переказ 1',
        })
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(body).toHaveProperty('id');
      expect(body.fromCardNumber).toBe(user1.cardNumber);
      expect(body.toCardNumber).toBe(user2.cardNumber);
      expect(Number(body.amount)).toBe(transferAmount);
      expect(body.currency).toBe(Currency.UAH);
      expect(body.description).toBe('Тестовий переказ 1');
    });

    it('повинен здійснити другий переказ (500 UAH)', async () => {
      const transferAmount = 500;
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          fromCardNumber: user1.cardNumber,
          toCardNumber: user2.cardNumber,
          amount: transferAmount,
          currency: Currency.UAH,
          description: 'Тестовий переказ 2',
        })
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(Number(body.amount)).toBe(transferAmount);
    });

    it('повинен здійснити третій переказ (1500 UAH)', async () => {
      const transferAmount = 1500;
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          fromCardNumber: user1.cardNumber,
          toCardNumber: user2.cardNumber,
          amount: transferAmount,
          currency: Currency.UAH,
          description: 'Тестовий переказ 3',
        })
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(Number(body.amount)).toBe(transferAmount);
    });

    it('повинен здійснити зворотний переказ від користувача 2 до користувача 1 (800 UAH)', async () => {
      const transferAmount = 800;
      const response = await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .send({
          fromCardNumber: user2.cardNumber,
          toCardNumber: user1.cardNumber,
          amount: transferAmount,
          currency: Currency.UAH,
          description: 'Зворотний переказ',
        })
        .expect(201);

      const body = response.body as TransactionResponse;
      expect(body.fromCardNumber).toBe(user2.cardNumber);
      expect(body.toCardNumber).toBe(user1.cardNumber);
      expect(Number(body.amount)).toBe(transferAmount);
    });

    it('повинен перевірити баланс користувача 1 після всіх транзакцій', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${user1.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      // Початковий баланс: 10000
      // Переказ 1: -1000
      // Переказ 2: -500
      // Переказ 3: -1500
      // Отримано від user2: +800
      // Фінальний: 10000 - 1000 - 500 - 1500 + 800 = 7800
      const body = response.body as AccountResponse;
      expect(Number(body.balance)).toBe(7800);
    });

    it('повинен перевірити баланс користувача 2 після всіх транзакцій', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/accounts/${user2.accountId}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      // Початковий баланс: 5000
      // Отримано від user1: +1000 + 500 + 1500 = 3000
      // Переказ до user1: -800
      // Фінальний: 5000 + 3000 - 800 = 7200
      const body = response.body as AccountResponse;
      expect(Number(body.balance)).toBe(7200);
    });

    it('не повинен дозволити переказ при недостатніх коштах', async () => {
      await request(app.getHttpServer())
        .post('/api/transactions')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          fromCardNumber: user1.cardNumber,
          toCardNumber: user2.cardNumber,
          amount: 100000, // Більше ніж на балансі
          currency: Currency.UAH,
        })
        .expect(400);
    });
  });

  describe('6. Перегляд історії транзакцій', () => {
    it('повинен отримати всі транзакції', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/transactions')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as TransactionResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('повинен отримати транзакції за номером карти користувача 1', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/transactions/card-number/${user1.cardNumber}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      const body = response.body as TransactionResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4); // 3 виходячих + 1 вхідний

      // Перевіряємо що є транзакції обох типів
      const outgoing = body.filter(
        (t) => t.fromCardNumber === user1.cardNumber,
      );
      const incoming = body.filter((t) => t.toCardNumber === user1.cardNumber);

      expect(outgoing.length).toBe(3);
      expect(incoming.length).toBe(1);
    });

    it('повинен отримати транзакції за номером карти користувача 2', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/transactions/card-number/${user2.cardNumber}`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      const body = response.body as TransactionResponse[];
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4); // 3 вхідних + 1 виходячий
    });
  });

  describe('7. Додаткові перевірки безпеки', () => {
    it('не повинен дозволити доступ без токену', async () => {
      await request(app.getHttpServer()).get('/api/accounts/my').expect(401);
    });

    it('не повинен дозволити доступ до чужого рахунку', async () => {
      await request(app.getHttpServer())
        .get(`/api/accounts/${user2.accountId}`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(403);
    });

    it('не повинен дозволити депозит на чужий рахунок', async () => {
      await request(app.getHttpServer())
        .post(`/api/accounts/${user2.accountId}/deposit`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          amount: 1000,
        })
        .expect(403);
    });
  });
});
