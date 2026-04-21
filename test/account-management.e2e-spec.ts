import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/shared/infrastructure/prisma/prisma.service';
import { createTestApplication } from './helpers/create-test-application';
import { cleanDatabase } from './helpers/clean-database';

/**
 * E2E: real HTTP + PostgreSQL (uses `.env` via jest-e2e setup).
 * Isolation: reset tables before each test to avoid cross-test coupling.
 */
describe('Account management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApplication());
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  function uniqueDocument(): string {
    const digits = `${Date.now()}${Math.floor(Math.random() * 1e6)}`;
    return digits.replace(/\D/g, '').slice(-11).padStart(11, '1');
  }

  it('runs create account → deposit → balance → withdraw → statement → block → deposit fails', async () => {
    const http = request(app.getHttpServer());

    const createPessoaRes = await http
      .post('/pessoas')
      .send({
        name: 'E2E User',
        document: uniqueDocument(),
        birthDate: '1990-06-15T00:00:00.000Z',
      })
      .expect(201);

    const personId = createPessoaRes.body.personId as number;
    expect(personId).toBeGreaterThan(0);

    const createAccountRes = await http
      .post('/accounts')
      .send({
        personId,
        dailyWithdrawalLimit: 10000,
        accountType: 1,
      })
      .expect(201);

    const accountId = createAccountRes.body.accountId as number;
    expect(accountId).toBeGreaterThan(0);
    expect(createAccountRes.body.balance).toBe(0);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 100 })
      .expect(201);

    const balanceRes = await http.get(`/accounts/${accountId}/balance`).expect(200);
    expect(balanceRes.body).toMatchObject({ accountId, balance: 100 });

    await http
      .post('/transactions/withdraw')
      .send({ accountId, value: 30 })
      .expect(201);

    const balanceAfterWithdraw = await http
      .get(`/accounts/${accountId}/balance`)
      .expect(200);
    expect(balanceAfterWithdraw.body.balance).toBe(70);

    const statementRes = await http
      .get(`/transactions/statement/${accountId}`)
      .query({
        fromDate: '2020-01-01T00:00:00.000Z',
        toDate: '2099-12-31T23:59:59.999Z',
      })
      .expect(200);

    expect(Array.isArray(statementRes.body)).toBe(true);
    expect(statementRes.body.length).toBeGreaterThanOrEqual(2);

    const blockRes = await http.patch(`/accounts/${accountId}/block`).expect(200);
    expect(blockRes.body.activeFlag).toBe(false);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 1 })
      .expect(400);
  });

  it('returns 400 when withdrawal exceeds balance (domain rule)', async () => {
    const http = request(app.getHttpServer());

    const { body: pessoa } = await http
      .post('/pessoas')
      .send({
        name: 'E2E Broke',
        document: uniqueDocument(),
        birthDate: '1991-01-01T00:00:00.000Z',
      })
      .expect(201);

    const { body: account } = await http
      .post('/accounts')
      .send({
        personId: pessoa.personId,
        dailyWithdrawalLimit: 10000,
        accountType: 1,
      })
      .expect(201);

    await http
      .post('/transactions/deposit')
      .send({ accountId: account.accountId, value: 10 })
      .expect(201);

    await http
      .post('/transactions/withdraw')
      .send({ accountId: account.accountId, value: 999 })
      .expect(400);
  });

  it('returns 400 when statement fromDate is after toDate', async () => {
    const http = request(app.getHttpServer());

    const { body: pessoa } = await http
      .post('/pessoas')
      .send({
        name: 'E2E Dates',
        document: uniqueDocument(),
        birthDate: '1992-01-01T00:00:00.000Z',
      })
      .expect(201);

    const { body: account } = await http
      .post('/accounts')
      .send({
        personId: pessoa.personId,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      })
      .expect(201);

    await http
      .get(`/transactions/statement/${account.accountId}`)
      .query({
        fromDate: '2030-01-01T00:00:00.000Z',
        toDate: '2020-01-01T00:00:00.000Z',
      })
      .expect(400);
  });
});
