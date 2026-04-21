import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Transaction } from '../entity/transaction.entity';
import {
  Prisma,
  PrismaClient,
  Transaction as PrismaTransaction,
} from '@prisma/client';
import { Decimal } from 'decimal.js';
import { DomainException } from '../../../shared/domain/domain.exception';
import { Account } from '../../accounts/entity/account.entity';

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps a Prisma Data Model to our Rich Domain Entity.
   */
  private mapToDomain(model: PrismaTransaction): Transaction {
    return Transaction.load({
      transactionId: model.transactionId,
      accountId: model.accountId,
      value: model.value,
      transactionDate: model.transactionDate,
    });
  }

  /** Start of calendar day in UTC (used for daily withdrawal totals). */
  private startOfTodayUtc(referenceDate: Date = new Date()): Date {
    return new Date(
      Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
  }

  /**
   * Total amount withdrawn today (absolute value), for the given DB client.
   * Must run inside the same interactive transaction as the withdrawal when enforcing limits.
   */
  private async sumWithdrawalsToday(
    db: Pick<PrismaClient, 'transaction'>,
    accountId: number,
    startOfTodayUTC: Date,
  ): Promise<Decimal> {
    const result = await db.transaction.aggregate({
      where: {
        accountId,
        transactionDate: { gte: startOfTodayUTC },
        value: { lt: 0 },
      },
      _sum: { value: true },
    });

    const sum = result._sum.value
      ? new Decimal(result._sum.value)
      : new Decimal(0);
    return sum.abs();
  }

  /**
   * Calculates the total amount withdrawn from an account TODAY (UTC).
   * Crucial for read-only reporting; authoritative enforcement happens in {@link executeFinancialOperation}.
   */
  async getTotalWithdrawnToday(accountId: number): Promise<Decimal> {
    return this.sumWithdrawalsToday(
      this.prisma,
      accountId,
      this.startOfTodayUtc(),
    );
  }

  /** Serializes financial operations per account row (PostgreSQL). */
  private async lockAccountForUpdate(
    tx: Prisma.TransactionClient,
    accountId: number,
  ): Promise<void> {
    await tx.$queryRaw(
      Prisma.sql`
        SELECT 1 FROM "accounts" WHERE "accountId" = ${accountId} FOR UPDATE
      `,
    );
  }

  /**
   * Retrieves the statement (history of transactions) for an account within a date range.
   */
  async getStatement(
    accountId: number,
    fromDate: Date,
    toDate: Date,
  ): Promise<Transaction[]> {
    // Ensure toDate includes the entire day (up to 23:59:59.999) in UTC
    const endOfDayUTC = new Date(
      Date.UTC(
        toDate.getUTCFullYear(),
        toDate.getUTCMonth(),
        toDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    const models = await this.prisma.transaction.findMany({
      where: {
        accountId,
        transactionDate: {
          gte: fromDate, // Assuming fromDate is already provided correctly by the client
          lte: endOfDayUTC,
        },
      },
      orderBy: {
        transactionDate: 'desc', // Newest first
      },
    });

    return models.map((model) => this.mapToDomain(model));
  }

  /**
   * Executes a financial operation (Deposit or Withdrawal) safely using an Interactive Database Transaction.
   * This guarantees ACID properties and prevents Race Conditions (e.g., overdrafts).
   */
  async executeFinancialOperation(
    transaction: Transaction,
  ): Promise<Transaction> {
    // Interactive Transaction ensures all read/write operations happen in an isolated, locked context
    return this.prisma.$transaction(async (tx) => {
      const startOfTodayUTC = this.startOfTodayUtc(new Date());

      // 1. Lock the account row so concurrent withdrawals serialize (balance + daily limit stay consistent)
      await this.lockAccountForUpdate(tx, transaction.accountId);

      // 2. Load full account row after the lock (same snapshot as the daily withdrawal sum)
      const currentAccount = await tx.account.findUnique({
        where: { accountId: transaction.accountId },
      });

      if (!currentAccount) {
        throw new DomainException(
          'Account not found during transaction execution',
        );
      }

      if (!currentAccount.activeFlag) {
        throw new DomainException(
          'Account is blocked. Cannot execute transaction.',
        );
      }

      // 3. Withdrawals: recompute today's withdrawals inside this tx, then reuse Account domain rules
      if (transaction.isWithdrawal()) {
        const withdrawnToday = await this.sumWithdrawalsToday(
          tx,
          transaction.accountId,
          startOfTodayUTC,
        );
        const domainAccount = Account.load({
          accountId: currentAccount.accountId,
          personId: currentAccount.personId,
          balance: currentAccount.balance,
          dailyWithdrawalLimit: currentAccount.dailyWithdrawalLimit,
          activeFlag: currentAccount.activeFlag,
          accountType: currentAccount.accountType,
          createDate: currentAccount.createDate,
        });
        domainAccount.withdraw(transaction.value.negated(), withdrawnToday);
      }

      // 4. Record the transaction history
      const createdTransactionModel = await tx.transaction.create({
        data: {
          accountId: transaction.accountId,
          value: transaction.value, // Positive for deposit, Negative for withdrawal
          transactionDate: transaction.transactionDate,
        },
      });

      // 5. Update the account balance RELATIVELY (Increment/Decrement)
      await tx.account.update({
        where: { accountId: transaction.accountId },
        data: {
          balance: {
            increment: transaction.value,
          },
        },
      });

      return this.mapToDomain(createdTransactionModel);
    });
  }
}
