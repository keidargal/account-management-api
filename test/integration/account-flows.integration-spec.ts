import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';
import { createTestApplication } from '../helpers/create-test-application';
import { cleanDatabase } from '../helpers/clean-database';

/**
 * Integration tests: real Nest app + real Prisma + real PostgreSQL.
 *
 * Isolation: Option A — `cleanDatabase` before each test (deterministic, easy to reason about).
 */
describe('Account flows (integration)', () => {
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

  async function createPersonAndAccount(
    dailyWithdrawalLimit: number,
  ): Promise<{ personId: number; accountId: number }> {
    const http = request(app.getHttpServer());
    const { body: pessoa } = await http
      .post('/pessoas')
      .send({
        name: 'Integration User',
        document: uniqueDocument(),
        birthDate: '1990-01-15T00:00:00.000Z',
      })
      .expect(201);

    const { body: account } = await http
      .post('/accounts')
      .send({
        personId: pessoa.personId,
        dailyWithdrawalLimit,
        accountType: 1,
      })
      .expect(201);

    return { personId: pessoa.personId, accountId: account.accountId };
  }

  it('deposit: creates transaction and updates balance in DB', async () => {
    const http = request(app.getHttpServer());
    const { accountId } = await createPersonAndAccount(10_000);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 100 })
      .expect(201);

    const balanceRes = await http
      .get(`/accounts/${accountId}/balance`)
      .expect(200);
    expect(balanceRes.body.balance).toBe(100);

    const row = await prisma.account.findUnique({ where: { accountId } });
    expect(row).not.toBeNull();
    expect(new Decimal(row!.balance.toString()).toNumber()).toBe(100);

    const txs = await prisma.transaction.findMany({ where: { accountId } });
    expect(txs).toHaveLength(1);
    expect(new Decimal(txs[0].value.toString()).toNumber()).toBe(100);
  });

  it('withdraw: creates negative transaction and updates balance', async () => {
    const http = request(app.getHttpServer());
    const { accountId } = await createPersonAndAccount(10_000);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 200 })
      .expect(201);
    await http
      .post('/transactions/withdraw')
      .send({ accountId, value: 50 })
      .expect(201);

    const balanceRes = await http
      .get(`/accounts/${accountId}/balance`)
      .expect(200);
    expect(balanceRes.body.balance).toBe(150);

    const txs = await prisma.transaction.findMany({
      where: { accountId },
      orderBy: { transactionId: 'asc' },
    });
    expect(txs).toHaveLength(2);
    expect(new Decimal(txs[1].value.toString()).toNumber()).toBe(-50);
  });

  it('withdraw: fails with insufficient funds (400)', async () => {
    const http = request(app.getHttpServer());
    const { accountId } = await createPersonAndAccount(10_000);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 10 })
      .expect(201);

    await http
      .post('/transactions/withdraw')
      .send({ accountId, value: 999 })
      .expect(400);
  });

  it('blocked account: deposit rejected (400)', async () => {
    const http = request(app.getHttpServer());
    const { accountId } = await createPersonAndAccount(10_000);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 5 })
      .expect(201);
    await http.patch(`/accounts/${accountId}/block`).expect(200);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 1 })
      .expect(400);
  });

  it('statement: returns transactions; optional date filter', async () => {
    const http = request(app.getHttpServer());
    const { accountId } = await createPersonAndAccount(10_000);

    await http
      .post('/transactions/deposit')
      .send({ accountId, value: 100 })
      .expect(201);
    await http
      .post('/transactions/withdraw')
      .send({ accountId, value: 25 })
      .expect(201);

    const all = await http
      .get(`/transactions/statement/${accountId}`)
      .query({
        fromDate: '2020-01-01T00:00:00.000Z',
        toDate: '2099-12-31T23:59:59.999Z',
      })
      .expect(200);

    expect(Array.isArray(all.body)).toBe(true);
    expect(all.body.length).toBeGreaterThanOrEqual(2);

    const futureOnly = await http
      .get(`/transactions/statement/${accountId}`)
      .query({
        fromDate: '2090-01-01T00:00:00.000Z',
        toDate: '2099-12-31T23:59:59.999Z',
      })
      .expect(200);

    expect(Array.isArray(futureOnly.body)).toBe(true);
    expect(futureOnly.body.length).toBe(0);
  });
});
