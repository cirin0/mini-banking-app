# AI coding guide for mini-banking-app

This is a NestJS + Prisma backend for a mini banking service. Use these repo-specific patterns to move fast and stay consistent with the codebase.

## Architecture and bootstrapping

- App wiring (`src/app.module.ts`): `ConfigModule` (global, `.env`), `PrismaModule` (global), and feature modules under `src/modules/*`: `AuthModule`, `UsersModule`, `AccountsModule`, `CardsModule`, `TransactionsModule`.
- Bootstrap (`src/main.ts`): sets global prefix from `API_PREFIX` (default `api`), enables `cookie-parser`, and a global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform). Swagger is served at `/api/docs` with Bearer auth named `access-token` and includes `displayRequestDuration: true` for performance monitoring.
- Global data access: `prisma/PrismaModule` provides `PrismaService` (extends `PrismaClient`) and loads env via `dotenv.config()`.

## Data layer (Prisma + Repository pattern)

- Database: PostgreSQL; connection from `DATABASE_URL` in `.env`.
- Key models and enums (see `prisma/schema.prisma`):
  - Enums: `Currency { UAH | USD | EUR }`, `CardType { DEBIT | CREDIT | PAYROLL }`, `PaymentSystem { VISA | MASTERCARD }`.
  - `User { id, fullName, email@unique, password, refreshToken?, accounts[], createdAt, updatedAt }`
  - `Account { id, balance Decimal, currency Currency, userId -> User, cards[], createdAt, updatedAt }`
  - `Card { id, cardNumber@unique, cardType, paymentSystem, expiryDate, hashedCvv?, accountId -> Account, createdAt, updatedAt }`
  - `Transaction { id, amount Decimal, currency Currency, description?, fromCardId -> Card, toCardId -> Card, createdAt }`
- Repository pattern: All database access goes through repository classes (e.g., `UsersRepository`, `AccountsRepository`, `CardsRepository`, `TransactionsRepository`, `AuthRepository`). Business services do not call `PrismaService` directly.
- Select discipline: Repositories always use `select` to avoid returning sensitive fields (e.g., never return `password` or `hashedCvv`). Special methods like `findByEmailWithPassword` exist for auth flows that need passwords.

## Auth flow and security

- Tokens: Access JWT uses `JWT_TOKEN_SECRET` (15m). Refresh JWT uses `JWT_REFRESH_TOKEN_SECRET` (7d). Refresh token is set as httpOnly cookie named `refreshToken` (sameSite=lax, secure in prod, maxAge 7d, path='/') and stored hashed in `User.refreshToken`.
- Endpoints (`src/modules/auth/auth.controller.ts`):
  - POST `/auth/register` → creates user (password hashing in `AuthService`) and creates a default account for the user (UAH by default).
  - POST `/auth/login` → returns `{ accessToken, refreshToken }` and sets refresh cookie.
  - POST `/auth/logout` (guarded) → clears refresh cookie and revokes stored refresh token hash.
  - POST `/auth/refresh` → reads `refreshToken` from cookies and issues new tokens, rotating the stored hash.
- Guard/strategy: `JwtAuthGuard` + `JwtStrategy` (Bearer token from `Authorization` header) validate and attach the minimal user `{ id, email, fullName }` to `req.user`.
- AuthRepository: provides specialized query methods for auth operations: `findByEmailWithPassword` (returns user with password for login validation) and `findByIdWithRefreshToken` (returns user with refresh token for token refresh operations).
- Secret sourcing: `AuthService` obtains secrets via `ConfigService.getOrThrow(...)` when signing tokens. Note: `AuthModule` registers `JwtModule` with `process.env.JWT_TOKEN_SECRET`; keep `.env` in sync.

## Users API

- Location: `src/modules/users/*`.
- Models: `User` (basic user info without password) and `Profile` (user with accounts and cards).
- Controller endpoints:
  - GET `/users` (public) → list all users (no passwords).
  - GET `/users/profile` (guarded) → uses `req.user.id` from JWT to fetch the current user's profile with accounts and cards.
  - GET `/users/email/:email` (public) → get user by email.
  - GET `/users/:id` (public) → get user by id.
- Service delegates all database operations to `UsersRepository`.
- Repository methods: `findById`, `findProfileById`, `findAll`, `findByEmail`, `create`, `update`, `delete`.

## Accounts API

- Location: `src/modules/accounts/*`.
- Limits: max 3 accounts per user; one account per currency. Service validates both limits before creating an account.
- Endpoints (all are prefixed with `/${API_PREFIX}` at runtime):
  - POST `/accounts` (guarded) → create account for current user; body: `{ currency: Currency }` (default UAH if omitted). Validates account count limit and ensures no duplicate currency accounts.
  - GET `/accounts/my` (guarded) → list current user's accounts (with basic user and cards info).
  - GET `/accounts/:id` (guarded) → get account by id; enforces ownership.
  - POST `/accounts/:accountId/deposit` (guarded) → deposit funds; body: `{ amount: number }`; enforces ownership and returns updated balance.

## Cards API

- Location: `src/modules/cards/*`.
- Limits: max 3 cards per account. Card numbers are generated to satisfy Luhn and payment system prefixes.
- Endpoints (all guarded with `JwtAuthGuard`):
  - POST `/cards/:accountId` → body: `{ cardType: CardType, paymentSystem: PaymentSystem }`; issues a card with generated number and hashed CVV (not returned).
  - GET `/cards/:cardId` → get card by id.
  - GET `/cards/account/:accountId` → get all cards for an account.
  - GET `/cards/number/:cardNumber` → get card by card number.
  - GET `/cards/user/:userId` → get all cards for a user.
  - GET `/cards/:cardId/cvv` → body: `{ password: string }`; returns decrypted CVV; requires user password verification and card ownership.
  - DELETE `/cards/account/:accountId` → delete all cards for an account; returns `{ deletedCount: number }`.
- Security: CVV is encrypted using `crypto.util.ts` and stored as `hashedCvv`. Only the card owner can retrieve CVV via password verification.
- Utilities: see `src/common/utils/card-validator.util.ts` for Luhn validation and number generation (VISA starts with `4`, MASTERCARD with `5`). See `src/common/utils/crypto.util.ts` for CVV encryption/decryption.

## Transactions API

- Location: `src/modules/transactions/*`.
- Rules: currency must match both cards' accounts; sufficient funds required; validates card existence. Balance updates and record creation happen inside a single database transaction.
- Endpoints (guarded):
  - POST `/transactions` → body: `{ fromCardNumber, toCardNumber, amount, currency, description? }` → performs transfer with validation (card existence, sufficient funds, currency matching).
  - GET `/transactions` → list all transactions (card numbers only; no internal IDs exposed).
  - GET `/transactions/:id` → get transaction by id.
  - GET `/transactions/card/:cardId` → get all transactions for a card by card id.
  - GET `/transactions/card-number/:cardNumber` → get all transactions for a card by card number.

## Conventions and imports

- Absolute imports from repo root are used (e.g., `src/...`, `prisma/...`), enabled by `tsconfig.json` (`baseUrl: "."`). Jest maps via `moduleNameMapper` in `package.json`.
- DTOs with `class-validator` drive input validation (errors surfaced by global `ValidationPipe`).
- Model organization: Each module may have a `model/` directory for TypeScript interfaces/classes that define return types (e.g., `users/model/users.model.ts`, `users/model/profile.model.ts`, `accounts/accounts.model.ts`, `cards/cards.model.ts`). These represent clean data shapes without sensitive fields.
- Return shapes: never include sensitive fields (e.g., `password`, `hashedCvv`, raw refresh token) — follow repository `select` patterns.
- Services call repositories, not Prisma directly. Create repository methods per query need. Low-level framework pieces (e.g., Passport strategies) may use `PrismaService` minimally when appropriate.

## Dev and test workflows

- Scripts (see `package.json`): `npm run start:dev`, `npm run build`, `npm test`, `npm run test:cov`, `npm run test:e2e`.
- Prisma: run migrations with `npx prisma migrate dev` and regenerate client with `npx prisma generate` when schema changes.
- Required env: `DATABASE_URL`, `JWT_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`; optional: `API_PREFIX`, `PORT`, `NODE_ENV`.
- E2E note: the sample e2e test hits `/` expecting "Hello World!" but the app has no root controller. Either add a simple root route or update/remove the test (`test/app.e2e-spec.ts`).
- Handy HTTP flows: see `src/test.http` for a ready-to-run sequence (login → accounts → cards → transfer → deposit).

## Swagger and guards

- Protect routes with `@UseGuards(JwtAuthGuard)`. Access current user via `req.user` as populated by `JwtStrategy`.
- Add `@ApiBearerAuth('access-token')` on protected controllers to surface Bearer auth in `/api/docs`.
- Swagger configuration includes `persistAuthorization: true` (saves auth between page reloads) and `displayRequestDuration: true` (shows request timing).

## Notes and TODOs

- README outlines a Proxy layer; it is not implemented yet in `src/`. If/when adding it, keep it as a separate module and consider middleware/interceptors for access/logging.
- Consider adding seed scripts for local dev and tests, and disabling or fixing the root e2e test.
- Add more unit/e2e tests for transactions and limits (account/card caps, currency mismatches) and for auth refresh flows.
