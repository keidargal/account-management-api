import { Decimal } from 'decimal.js';
import { DomainException } from '../../../shared/domain/domain.exception';

export class Transaction {
  private constructor(
    public readonly transactionId: number,
    public readonly accountId: number,
    private readonly _value: Decimal,
    public readonly transactionDate: Date,
  ) {}

  /**
   * Factory method for creating a NEW DEPOSIT transaction.
   * Enforces that the deposit amount is strictly positive.
   */
  static createDeposit(props: {
    accountId: number;
    amount: number | string | Decimal;
  }): Transaction {
    const depositAmount = new Decimal(props.amount);

    if (depositAmount.lte(0)) {
      throw new DomainException('Deposit amount must be greater than zero');
    }

    return new Transaction(
      0, // ID is 0 until persisted
      props.accountId,
      depositAmount, // Stored as positive
      new Date(),
    );
  }

  /**
   * Factory method for creating a NEW WITHDRAWAL transaction.
   * Enforces that the input amount is strictly positive,
   * but stores it internally as a negative value.
   */
  static createWithdrawal(props: {
    accountId: number;
    amount: number | string | Decimal;
  }): Transaction {
    const withdrawalAmount = new Decimal(props.amount);

    if (withdrawalAmount.lte(0)) {
      throw new DomainException('Withdrawal amount must be greater than zero');
    }

    return new Transaction(
      0, // ID is 0 until persisted
      props.accountId,
      withdrawalAmount.negated(), // Automatically converted to negative!
      new Date(),
    );
  }

  /**
   * Factory method for RECONSTRUCTING an existing transaction from the database.
   */
  static load(props: {
    transactionId: number;
    accountId: number;
    value: number | string | Decimal;
    transactionDate: Date;
  }): Transaction {
    return new Transaction(
      props.transactionId,
      props.accountId,
      new Decimal(props.value),
      props.transactionDate,
    );
  }

  // --- Getters ---
  get value(): Decimal {
    return this._value;
  }

  /**
   * Helper method to determine if the transaction is a deposit.
   */
  isDeposit(): boolean {
    return this._value.isPositive();
  }

  /**
   * Helper method to determine if the transaction is a withdrawal.
   */
  isWithdrawal(): boolean {
    return this._value.isNegative();
  }
}
