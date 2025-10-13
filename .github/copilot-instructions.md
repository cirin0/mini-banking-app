# AI coding guide for mini-banking-app

This is a NestJS + Prisma backend for a mini banking service. Use these repo-specific patterns to be productive fast.

## Architecture and bootstrapping

- Modules: `AppModule` wires `ConfigModule` (global), `PrismaModule` (global), `AuthModule`, `UsersModule`.
- `main.ts` sets global prefix from `API_PREFIX` (default `api`), enables `cookie-parser`, and a global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform). Swagger is served at `/api/docs` with Bearer auth named `access-token`.
- Global data access: `prisma/PrismaModule` provides `PrismaService` (extends `PrismaClient`) and loads env via `dotenv.config()`.

## Data layer (Prisma + Repository pattern)

- Database: PostgreSQL; connection from `DATABASE_URL` in `.env`.
- Key models (see `prisma/schema.prisma`):
  - `User { id, fullName, email@unique, password, refreshToken?, createdAt, updatedAt }`
  - `Account { id, accountNumber@unique, balance Decimal, userId -> User, createdAt }`
  - `Transaction { id, amount Decimal, fromAccountId, toAccountId, createdAt }` (note: a partial relation exists via `accountId`; accounts/transfers domain is not yet implemented in `src/`)
- **Repository pattern**: All database access goes through repository classes (e.g., `UsersRepository`). Services never call `PrismaService` directly.
- Convention: Repositories always use `select` to avoid returning sensitive fields (e.g., password). Special methods like `findByEmailWithPassword` exist for auth flows that need passwords.

## Auth flow and security

- JWT access tokens use `JWT_TOKEN_SECRET` (15m expiry). Refresh tokens use `JWT_REFRESH_TOKEN_SECRET` (7d), are set as `httpOnly` cookie named `refreshToken` (sameSite=lax, secure in prod), and stored hashed in `User.refreshToken`.
- Endpoints (`src/auth/auth.controller.ts`):
  - `POST /auth/register` -> creates user (password hashing done in `AuthService`).
  - `POST /auth/login` -> returns `{ accessToken }` and sets refresh cookie.
  - `POST /auth/logout` (guarded) -> clears refresh cookie and revokes stored hash.
  - `POST /auth/refresh` -> reads `refreshToken` from cookies and issues new tokens.
- Guard/strategy: `JwtAuthGuard` + `JwtStrategy` (Bearer token from `Authorization` header) validate and attach minimal user.
- `AuthService` uses `UsersRepository` for database queries (not `PrismaService` directly).
- Always obtain secrets via `ConfigService.getOrThrow(...)`.
- Note: `AuthModule` registers `JwtModule` with `ConfigService.prototype.getOrThrow('JWT_TOKEN_SECRET')` at import-time. If env names change, update here as well.

## Users API

- `src/users/users.controller.ts`:
  - `GET /users` (public list)
  - `GET /users/profile` (guarded) -> uses `req.user.id` from JWT to fetch current user
  - `GET /users/email/:email`, `GET /users/:id`
- `UsersService` delegates all database operations to `UsersRepository`.

## Conventions and imports

- Absolute imports from repo root are used (e.g., `src/...`, `prisma/...`), enabled by `tsconfig.json` `baseUrl: "."` (Jest maps via `moduleNameMapper`).
- DTOs with `class-validator` drive input validation (errors surfaced by global `ValidationPipe`).
- When returning user objects, never include `password` (follow existing repository `select` patterns).
- **New feature**: Services call repositories, not Prisma directly. Create repository methods for each specific query need.

## Dev and test workflows

- Scripts (see `package.json`): `npm run start:dev`, `npm run build`, `npm test`, `npm run test:cov`, `npm run test:e2e`.
- Prisma: run migrations with `npx prisma migrate dev` and regenerate client with `npx prisma generate` when schema changes.
- Required env: `DATABASE_URL`, `JWT_TOKEN_SECRET`, `JWT_REFRESH_TOKEN_SECRET`; optional: `API_PREFIX`, `PORT`, `NODE_ENV`.
- Unit tests live in `src/**/*.spec.ts` (Jest rootDir=`src`); E2E in `test/` (see `test/jest-e2e.json`). The sample e2e test hits `/` expecting "Hello World!" — update or remove if not applicable.

## Swagger and guards (usage pattern)

- Add `@UseGuards(JwtAuthGuard)` to protect routes; access current user via `req.user` (as shaped by `JwtStrategy`).
- Add `@ApiBearerAuth('access-token')` on protected controllers to show Bearer auth in `/api/docs`.

Notes

- README references a Proxy layer; `src/config/proxy.config.ts` exists but is currently empty (feature not yet implemented in `src/`).
