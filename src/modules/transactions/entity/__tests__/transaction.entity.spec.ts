import { Transaction } from '../transaction.entity';
import { DomainException } from '../../../../shared/domain/domain.exception';
import { Decimal } from 'decimal.js';

function expectDomainException(fn: () => void, message: string): void {
  expect(fn).toThrow(DomainException);
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(DomainException);
    expect((e as DomainException).message).toBe(message);
  }
}

describe('Transaction Entity (Domain)', () => {
  describe('createDeposit', () => {
    it('should create a deposit transaction with a positive value', () => {
      const transaction = Transaction.createDeposit({
        accountId: 1,
        amount: 150.5,
      });

      expect(transaction.accountId).toBe(1);
      expect(transaction.value.toNumber()).toBe(150.5);
      expect(transaction.isDeposit()).toBe(true);
      expect(transaction.isWithdrawal()).toBe(false);
      expect(transaction.transactionDate).toBeInstanceOf(Date);
    });

    it.each([
      { amount: 0, label: 'zero' },
      { amount: -50, label: 'negative' },
    ])('should reject deposit when amount is $label', ({ amount }) => {
      expectDomainException(
        () => Transaction.createDeposit({ accountId: 1, amount }),
        'Deposit amount must be greater than zero',
      );
    });
  });

  describe('createWithdrawal', () => {
    it('should create a withdrawal and store a negative value', () => {
      const transaction = Transaction.createWithdrawal({
        accountId: 1,
        amount: 150.5,
      });

      expect(transaction.accountId).toBe(1);
      expect(transaction.value.toNumber()).toBe(-150.5);
      expect(transaction.isDeposit()).toBe(false);
      expect(transaction.isWithdrawal()).toBe(true);
      expect(transaction.transactionDate).toBeInstanceOf(Date);
    });

    it.each([
      { amount: 0, label: 'zero' },
      { amount: -50, label: 'negative' },
    ])('should reject withdrawal when amount is $label', ({ amount }) => {
      expectDomainException(
        () => Transaction.createWithdrawal({ accountId: 1, amount }),
        'Withdrawal amount must be greater than zero',
      );
    });
  });

  describe('load', () => {
    it('should reconstruct an existing transaction', () => {
      const date = new Date('2024-01-01T10:00:00.000Z');
      const transaction = Transaction.load({
        transactionId: 5,
        accountId: 1,
        value: new Decimal(-100),
        transactionDate: date,
      });

      expect(transaction.transactionId).toBe(5);
      expect(transaction.accountId).toBe(1);
      expect(transaction.value.toNumber()).toBe(-100);
      expect(transaction.transactionDate).toBe(date);
      expect(transaction.isWithdrawal()).toBe(true);
    });
  });
});
