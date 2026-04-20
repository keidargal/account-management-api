import { Decimal } from 'decimal.js';

export class Account {
  private constructor(
    public readonly accountId: number,
    public readonly personId: number,
    private _balance: Decimal,
    private _dailyWithdrawalLimit: Decimal,
    private _activeFlag: boolean,
    public readonly accountType: number,
    public readonly createDate: Date,
  ) {}

  /**
   * Factory method for creating a BRAND NEW account.
   * Enforces initial business rules (e.g., starting balance is 0, active by default).
   */
  static createNew(props: {
    personId: number;
    dailyWithdrawalLimit: number | string | Decimal;
    accountType: number;
  }): Account {
    const dailyLimit = new Decimal(props.dailyWithdrawalLimit);
    
    if (dailyLimit.isNegative()) {
      throw new Error('Daily withdrawal limit cannot be negative');
    }

    return new Account(
      0, // ID is 0 until persisted in the database
      props.personId,
      new Decimal(0), // New accounts ALWAYS start with 0 balance
      dailyLimit,
      true, // New accounts are ALWAYS active by default
      props.accountType,
      new Date(),
    );
  }

  /**
   * Factory method for RECONSTRUCTING an existing account from the database.
   * Bypasses initial creation rules because the data is already trusted.
   */
  static load(props: {
    accountId: number;
    personId: number;
    balance: number | string | Decimal;
    dailyWithdrawalLimit: number | string | Decimal;
    activeFlag: boolean;
    accountType: number;
    createDate: Date;
  }): Account {
    return new Account(
      props.accountId,
      props.personId,
      new Decimal(props.balance),
      new Decimal(props.dailyWithdrawalLimit),
      props.activeFlag,
      props.accountType,
      props.createDate,
    );
  }

  // --- Getters ---
  get balance(): Decimal {
    return this._balance;
  }

  get dailyWithdrawalLimit(): Decimal {
    return this._dailyWithdrawalLimit;
  }

  get isActive(): boolean {
    return this._activeFlag;
  }

  // --- Business Logic (Rich Domain Model) ---

  /**
   * Blocks the account, preventing future transactions.
   */
  block(): void {
    if (!this._activeFlag) {
      throw new Error('Account is already blocked');
    }
    this._activeFlag = false;
  }

  /**
   * Deposits money into the account.
   * @param amount The amount to deposit
   */
  deposit(amount: number | string | Decimal): void {
    if (!this.isActive) {
      throw new Error('Cannot deposit into a blocked account');
    }
    
    const depositAmount = new Decimal(amount);
    if (depositAmount.lte(0)) {
      throw new Error('Deposit amount must be greater than zero');
    }
    
    this._balance = this._balance.plus(depositAmount);
  }

  /**
   * Withdraws money from the account.
   * @param amount The amount to withdraw
   * @param totalWithdrawnToday The total amount already withdrawn today (queried by the Service)
   */
  withdraw(amount: number | string | Decimal, totalWithdrawnToday: number | string | Decimal): void {
    if (!this.isActive) {
      throw new Error('Cannot withdraw from a blocked account');
    }

    const withdrawAmount = new Decimal(amount);
    const withdrawnToday = new Decimal(totalWithdrawnToday);

    if (withdrawAmount.lte(0)) {
      throw new Error('Withdrawal amount must be greater than zero');
    }

    if (withdrawAmount.gt(this._balance)) {
      throw new Error('Insufficient balance');
    }

    if (withdrawnToday.plus(withdrawAmount).gt(this._dailyWithdrawalLimit)) {
      throw new Error('Withdrawal amount exceeds daily limit');
    }
    
    this._balance = this._balance.minus(withdrawAmount);
  }
}
