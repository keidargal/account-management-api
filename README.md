# Account Management API

REST API for managing people (`Pessoa`), bank accounts, and financial transactions. Built with **NestJS**, **TypeScript**, **Prisma 6**, and **PostgreSQL**, with a modular layout and domain rules enforced in entities and transactional persistence.

## Stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js |
| Framework | NestJS 11 |
| ORM | Prisma 6 (`@prisma/client`) |
| Database | PostgreSQL 15 (Docker image in `docker-compose.yml`) |
| Validation | `class-validator` / `class-transformer` |
| Money | `decimal.js` in the domain layer; `Decimal` in Prisma |

## Architecture (high level)

- **Feature modules** under `src/modules/` (`pessoas`, `accounts`, `transactions`): each exposes controllers, application services (use cases), Prisma repositories, and domain entities where business rules live.
- **Shared** code: global exception filter (`DomainException` maps to HTTP 400), `PrismaService` extending `PrismaClient`.
- **Financial safety**: money-moving paths use Prisma interactive transactions and relative balance updates to reduce race conditions; daily withdrawal totals use UTC day boundaries for queries.

```text
HTTP (DTO validation) → Controller → Service → Repository (Prisma) / Domain entity
```

## Prerequisites

- Node.js (LTS recommended)
- npm
- Docker (or a local PostgreSQL instance you can point `DATABASE_URL` at)

## Environment variables

1. Copy `.env.example` to `.env` at the project root.
2. Adjust `DB_*` if you change Docker credentials or port.
3. `DATABASE_URL` must match your PostgreSQL instance (Prisma reads it from `prisma/schema.prisma`).

For **integration tests**, copy `.env.test.example` to `.env.test` and use a **separate database** (e.g. `account_management_test`). Never point tests at production data.

## Database setup (local)

### Option A: Docker Compose

From the project root (with `.env` loaded so `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` are set):

```bash
docker compose up -d
```

Create / update `DATABASE_URL` in `.env` so it matches the running container (see `.env.example`).

### Option B: Existing PostgreSQL

Set `DATABASE_URL` in `.env` to your server and database name.

### Migrations and seed

```bash
npx prisma migrate deploy
npx prisma db seed
```

- **Migrations** live in `prisma/migrations/`.
- **Seed** creates at least one default `Pessoa` (see `prisma/seed/seed.ts`).

For the **test database** used by integration tests:

```bash
# Example: set DATABASE_URL to your test DB, then:
npx prisma migrate deploy
```

## Run the application

```bash
npm install
npm run start:dev
```

Default HTTP port: **3000** (or `PORT` if set).

## API overview

Base URL: `http://localhost:3000` (unless configured otherwise).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/pessoas` | Create a person |
| `GET` | `/pessoas/:id` | Get person by id |
| `POST` | `/accounts` | Create account for a person |
| `GET` | `/accounts/:accountId/balance` | Account balance |
| `PATCH` | `/accounts/:accountId/block` | Block account |
| `POST` | `/transactions/deposit` | Deposit |
| `POST` | `/transactions/withdraw` | Withdraw |
| `GET` | `/transactions/statement/:accountId` | Statement (optional period) |

### Request bodies (JSON)

**Create person** `POST /pessoas`

- `name` (string)
- `document` (string; validated via domain rules / length)
- `birthDate` (ISO date string)

**Create account** `POST /accounts`

- `personId` (integer)
- `dailyWithdrawalLimit` (integer, ≥ 0)
- `accountType` (integer)

**Deposit / withdraw** `POST /transactions/deposit` | `withdraw`

- `accountId` (integer)
- `value` (positive number, up to 4 decimal places)

**Statement** `GET /transactions/statement/:accountId`

- Query (optional): `fromDate`, `toDate` (ISO date strings). If omitted, sensible defaults apply (wide range / “until now”).

### Responses

Success responses use response DTOs with `class-transformer` where applicable. Business rule failures typically return **400** with a JSON body from the global exception filter; validation errors follow Nest’s validation pipe behavior.

## Business rules (summary)

- Deposits and withdrawals are rejected for **blocked** accounts.
- Withdrawals require **sufficient balance** and respect a **daily withdrawal limit** (computed from same-day withdrawal totals in UTC).
- Statement can be constrained by **date range**; invalid ranges (e.g. `fromDate` after `toDate`) are rejected.

## Testing

| Command | What it runs |
|---------|----------------|
| `npm test` | Unit tests (`*.spec.ts` under `src/`) |
| `npm run test:e2e` | End-to-end tests against the app; expects `.env` with `DATABASE_URL` (see `test/jest-e2e.json` + `test/dotenv-config.ts`) |
| `npm run test:integration` | Integration tests against a **test** DB; requires `.env.test` (see `test/jest-integration.json` + `test/dotenv-test.ts`) |
| `npm run test:cov` | Unit test coverage |

- E2E and integration suites reset data between tests using helpers under `test/helpers/` (delete order respects foreign keys).
- Integration tests should use a **dedicated database** configured in `.env.test`.

## Assumptions

- Amounts are handled with sufficient precision for the exercise (`Decimal` / `decimal.js`); currency is not modeled as a separate concept.
- Dates for limits and statements use **UTC** in persistence queries to avoid ambiguous “today” semantics.
- Authentication and authorization are out of scope unless added later.

## License

UNLICENSED (private project).
