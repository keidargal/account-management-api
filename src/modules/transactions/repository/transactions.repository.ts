import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Transaction } from '../entity/transaction.entity';
import { Transaction as PrismaTransaction } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { DomainException } from '../../../shared/domain/domain.exception';

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

  /**
   * Calculates the total amount withdrawn from an account TODAY (UTC).
   * Crucial for enforcing the daily withdrawal limit business rule.
   */
  async getTotalWithdrawnToday(accountId: number): Promise<Decimal> {
    const now = new Date();
    // Calculate the start of the current day in UTC to avoid timezone bugs
    const startOfTodayUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    ));

    // Aggregate all negative transactions (withdrawals) for today
    const result = await this.prisma.transaction.aggregate({
      where: {
        accountId,
        transactionDate: {
          gte: startOfTodayUTC, // Safe UTC date comparison
        },
        value: {
          lt: 0, // Only withdrawals (negative values)
        },
      },
      _sum: {
        value: true,
      },
    });

    // The sum will be negative (e.g., -150). We return the absolute value (150)
    // so the Account entity can easily compare it against the daily limit.
    const sum = result._sum.value ? new Decimal(result._sum.value) : new Decimal(0);
    return sum.abs();
  }

  /**
   * Retrieves the statement (history of transactions) for an account within a date range.
   */
  async getStatement(accountId: number, fromDate: Date, toDate: Date): Promise<Transaction[]> {
    // Ensure toDate includes the entire day (up to 23:59:59.999) in UTC
    const endOfDayUTC = new Date(Date.UTC(
      toDate.getUTCFullYear(),
      toDate.getUTCMonth(),
      toDate.getUTCDate(),
      23, 59, 59, 999
    ));

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
  async executeFinancialOperation(transaction: Transaction): Promise<Transaction> {
    // Interactive Transaction ensures all read/write operations happen in an isolated, locked context
    return this.prisma.$transaction(async (tx) => {
      
      // 1. Fetch the latest account state directly within the transaction lock
      const currentAccount = await tx.account.findUnique({
        where: { accountId: transaction.accountId },
        select: { balance: true, activeFlag: true },
      });

      if (!currentAccount) {
        throw new DomainException('Account not found during transaction execution');
      }

      if (!currentAccount.activeFlag) {
        throw new DomainException('Account is blocked. Cannot execute transaction.');
      }

      // 2. If it's a withdrawal, verify sufficient funds at this exact millisecond
      if (transaction.isWithdrawal()) {
        const currentBalance = new Decimal(currentAccount.balance);
        // transaction.value is negative for withdrawals, so we add it to the balance
        const newBalance = currentBalance.plus(transaction.value); 

        if (newBalance.isNegative()) {
          throw new DomainException('Insufficient balance (prevented by database transaction lock)');
        }
      }

      // 3. Record the transaction history
      const createdTransactionModel = await tx.transaction.create({
        data: {
          accountId: transaction.accountId,
          value: transaction.value, // Positive for deposit, Negative for withdrawal
          transactionDate: transaction.transactionDate,
        },
      });
      
      // 4. Update the account balance RELATIVELY (Increment/Decrement)
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
