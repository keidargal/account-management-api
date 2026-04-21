import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TransactionsRepository } from '../repository/transactions.repository';
import { AccountsRepository } from '../../accounts/repository/accounts.repository';
import { Transaction } from '../entity/transaction.entity';
import { Account } from '../../accounts/entity/account.entity';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly accountsRepository: AccountsRepository,
  ) {}

  /**
   * Helper method to fetch an account or throw a NotFoundException.
   * Centralizes the "find or throw" logic to keep use cases clean and DRY.
   */
  private async getAccountOrThrow(accountId: number): Promise<Account> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    return account;
  }

  /**
   * Use Case: Deposit money into an account
   */
  async deposit(accountId: number, amount: number): Promise<Transaction> {
    // 1. Fetch the account to ensure it exists
    const account = await this.getAccountOrThrow(accountId);

    // 2. Domain Validation: Let the Account entity validate if it can receive a deposit
    // (e.g., checks if the account is blocked)
    account.deposit(amount);

    // 3. Create the Transaction Domain Entity
    // (Validates that the amount is strictly positive)
    const transaction = Transaction.createDeposit({ accountId, amount });

    // 4. Persist safely using the Database Transaction
    return this.transactionsRepository.executeFinancialOperation(transaction);
  }

  /**
   * Use Case: Withdraw money from an account
   */
  async withdraw(accountId: number, amount: number): Promise<Transaction> {
    // Existence check for a clear 404; balance, daily limit, and blocked state are enforced
    // inside executeFinancialOperation under a row lock + single DB transaction.
    await this.getAccountOrThrow(accountId);

    const transaction = Transaction.createWithdrawal({ accountId, amount });

    return this.transactionsRepository.executeFinancialOperation(transaction);
  }

  /**
   * Use Case: Get Account Statement (Transactions by period)
   */
  async getStatement(accountId: number, fromDate: Date, toDate: Date): Promise<Transaction[]> {
    // 1. Ensure the account exists before querying its statement
    await this.getAccountOrThrow(accountId);

    // 2. Basic input validation
    if (fromDate > toDate) {
      throw new BadRequestException('fromDate cannot be after toDate');
    }

    // 3. Fetch the statement from the repository
    return this.transactionsRepository.getStatement(accountId, fromDate, toDate);
  }
}
