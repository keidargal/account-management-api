import { Account } from '../account.entity';
import { DomainException } from '../../../../shared/domain/domain.exception';
import { Decimal } from 'decimal.js';

/** Reduces noise and keeps each example focused on the behavior under test. */
function makeLoadedAccount(
  overrides: Partial<{
    accountId: number;
    personId: number;
    balance: Decimal;
    dailyWithdrawalLimit: Decimal;
    activeFlag: boolean;
    accountType: number;
    createDate: Date;
  }> = {},
): Account {
  return Account.load({
    accountId: 1,
    personId: 1,
    balance: new Decimal(1000),
    dailyWithdrawalLimit: new Decimal(500),
    activeFlag: true,
    accountType: 1,
    createDate: new Date(),
    ...overrides,
  });
}

function expectDomainException(fn: () => void, message: string): void {
  expect(fn).toThrow(DomainException);
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainException);
    expect((e as DomainException).message).toBe(message);
  }
}

describe('Account Entity (Domain)', () => {
  describe('createNew', () => {
    it('should create a new account with 0 balance and active status', () => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });

      expect(account.balance.toNumber()).toBe(0);
      expect(account.isActive).toBe(true);
      expect(account.dailyWithdrawalLimit.toNumber()).toBe(1000);
      expect(account.personId).toBe(1);
    });

    it('should throw if daily withdrawal limit is negative', () => {
      expectDomainException(
        () =>
          Account.createNew({
            personId: 1,
            dailyWithdrawalLimit: -100,
            accountType: 1,
          }),
        'Daily withdrawal limit cannot be negative',
      );
    });
  });

  describe('deposit', () => {
    it('should increase the balance when depositing a positive amount', () => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });

      account.deposit(500);
      expect(account.balance.toNumber()).toBe(500);

      account.deposit(250.5);
      expect(account.balance.toNumber()).toBe(750.5);
    });

    it.each([
      { amount: 0, label: 'zero' },
      { amount: -100, label: 'negative' },
    ])('should reject deposit when amount is $label', ({ amount }) => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });
      expectDomainException(() => account.deposit(amount), 'Deposit amount must be greater than zero');
    });

    it('should reject deposit into a blocked account', () => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });
      account.block();

      expectDomainException(
        () => account.deposit(100),
        'Cannot deposit into a blocked account',
      );
    });
  });

  describe('withdraw', () => {
    it('should decrease the balance when withdrawing a valid amount', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(1000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      account.withdraw(200, 0);
      expect(account.balance.toNumber()).toBe(800);
    });

    it('should allow withdrawal up to the daily limit (boundary: full limit in one operation)', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(2000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      account.withdraw(500, 0);
      expect(account.balance.toNumber()).toBe(1500);
    });

    it('should allow withdrawal when cumulative amount equals the daily limit', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(2000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      account.withdraw(100, 400);
      expect(account.balance.toNumber()).toBe(1900);
    });

    it('should reject when cumulative withdrawals would exceed the daily limit', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(2000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      expectDomainException(
        () => account.withdraw(101, 400),
        'Withdrawal amount exceeds daily limit',
      );
    });

    it('should throw when withdrawing more than the balance', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(100),
        dailyWithdrawalLimit: new Decimal(500),
      });

      expectDomainException(() => account.withdraw(150, 0), 'Insufficient balance');
    });

    it('should throw when a single withdrawal exceeds the daily limit', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(1000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      expectDomainException(
        () => account.withdraw(600, 0),
        'Withdrawal amount exceeds daily limit',
      );
    });

    it('should throw when prior withdrawals plus this one exceed the daily limit', () => {
      const account = makeLoadedAccount({
        balance: new Decimal(1000),
        dailyWithdrawalLimit: new Decimal(500),
      });

      expectDomainException(
        () => account.withdraw(200, 400),
        'Withdrawal amount exceeds daily limit',
      );
    });

    it.each([
      { amount: 0, label: 'zero' },
      { amount: -50, label: 'negative' },
    ])('should reject withdrawal when amount is $label', ({ amount }) => {
      const account = makeLoadedAccount();
      expectDomainException(
        () => account.withdraw(amount, 0),
        'Withdrawal amount must be greater than zero',
      );
    });

    it('should reject withdrawal from a blocked account', () => {
      const account = makeLoadedAccount({ activeFlag: false });

      expectDomainException(
        () => account.withdraw(100, 0),
        'Cannot withdraw from a blocked account',
      );
    });
  });

  describe('block', () => {
    it('should set activeFlag to false', () => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });
      expect(account.isActive).toBe(true);

      account.block();
      expect(account.isActive).toBe(false);
    });

    it('should throw if already blocked', () => {
      const account = Account.createNew({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });
      account.block();

      expectDomainException(() => account.block(), 'Account is already blocked');
    });
  });
});
