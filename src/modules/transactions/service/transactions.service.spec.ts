import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from '../repository/transactions.repository';
import { AccountsRepository } from '../../accounts/repository/accounts.repository';
import { Account } from '../../accounts/entity/account.entity';
import { Transaction } from '../entity/transaction.entity';
import { Decimal } from 'decimal.js';
import { DomainException } from '../../../shared/domain/domain.exception';

describe('TransactionsService (Application)', () => {
  let service: TransactionsService;
  let transactionsRepository: jest.Mocked<
    Pick<
      TransactionsRepository,
      'executeFinancialOperation' | 'getTotalWithdrawnToday' | 'getStatement'
    >
  >;
  let accountsRepository: jest.Mocked<Pick<AccountsRepository, 'findById'>>;

  const activeAccount = () =>
    Account.load({
      accountId: 1,
      personId: 1,
      balance: new Decimal(1000),
      dailyWithdrawalLimit: new Decimal(500),
      activeFlag: true,
      accountType: 1,
      createDate: new Date(),
    });

  beforeEach(async () => {
    const mockTransactions: jest.Mocked<
      Pick<
        TransactionsRepository,
        'executeFinancialOperation' | 'getTotalWithdrawnToday' | 'getStatement'
      >
    > = {
      executeFinancialOperation: jest.fn(),
      getTotalWithdrawnToday: jest.fn(),
      getStatement: jest.fn(),
    };
    const mockAccounts: jest.Mocked<Pick<AccountsRepository, 'findById'>> = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: TransactionsRepository, useValue: mockTransactions },
        { provide: AccountsRepository, useValue: mockAccounts },
      ],
    }).compile();

    service = module.get(TransactionsService);
    transactionsRepository = module.get(TransactionsRepository);
    accountsRepository = module.get(AccountsRepository);
  });

  describe('deposit', () => {
    it('should throw when account is missing', async () => {
      accountsRepository.findById.mockResolvedValue(null);

      await expect(service.deposit(1, 50)).rejects.toThrow(NotFoundException);
      expect(
        transactionsRepository.executeFinancialOperation,
      ).not.toHaveBeenCalled();
    });

    it('should orchestrate deposit and return persisted transaction', async () => {
      accountsRepository.findById.mockResolvedValue(activeAccount());
      const persisted = Transaction.load({
        transactionId: 9,
        accountId: 1,
        value: new Decimal(50),
        transactionDate: new Date(),
      });
      transactionsRepository.executeFinancialOperation.mockResolvedValue(persisted);

      const result = await service.deposit(1, 50);

      expect(transactionsRepository.executeFinancialOperation).toHaveBeenCalledTimes(
        1,
      );
      expect(result.transactionId).toBe(9);
    });
  });

  describe('withdraw', () => {
    it('should throw when account is missing', async () => {
      accountsRepository.findById.mockResolvedValue(null);

      await expect(service.withdraw(1, 10)).rejects.toThrow(NotFoundException);
    });

    it('should load daily withdrawn total then persist', async () => {
      accountsRepository.findById.mockResolvedValue(activeAccount());
      transactionsRepository.getTotalWithdrawnToday.mockResolvedValue(
        new Decimal(100),
      );
      transactionsRepository.executeFinancialOperation.mockResolvedValue(
        Transaction.load({
          transactionId: 2,
          accountId: 1,
          value: new Decimal(-50),
          transactionDate: new Date(),
        }),
      );

      await service.withdraw(1, 50);

      expect(transactionsRepository.getTotalWithdrawnToday).toHaveBeenCalledWith(1);
      expect(transactionsRepository.executeFinancialOperation).toHaveBeenCalledTimes(1);
    });

    it('should not persist when domain rules reject the withdrawal', async () => {
      accountsRepository.findById.mockResolvedValue(
        Account.load({
          accountId: 1,
          personId: 1,
          balance: new Decimal(10),
          dailyWithdrawalLimit: new Decimal(500),
          activeFlag: true,
          accountType: 1,
          createDate: new Date(),
        }),
      );
      transactionsRepository.getTotalWithdrawnToday.mockResolvedValue(
        new Decimal(0),
      );

      await expect(service.withdraw(1, 999)).rejects.toThrow(DomainException);
      expect(
        transactionsRepository.executeFinancialOperation,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getStatement', () => {
    it('should throw when account is missing', async () => {
      accountsRepository.findById.mockResolvedValue(null);
      const from = new Date('2024-01-01T00:00:00.000Z');
      const to = new Date('2024-01-31T00:00:00.000Z');

      await expect(service.getStatement(1, from, to)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject when fromDate is after toDate', async () => {
      accountsRepository.findById.mockResolvedValue(activeAccount());
      const from = new Date('2024-02-01T00:00:00.000Z');
      const to = new Date('2024-01-01T00:00:00.000Z');

      await expect(service.getStatement(1, from, to)).rejects.toThrow(
        BadRequestException,
      );
      expect(transactionsRepository.getStatement).not.toHaveBeenCalled();
    });

    it('should return transactions for a valid period', async () => {
      accountsRepository.findById.mockResolvedValue(activeAccount());
      const from = new Date('2024-01-01T00:00:00.000Z');
      const to = new Date('2024-01-31T00:00:00.000Z');
      const rows: Transaction[] = [];
      transactionsRepository.getStatement.mockResolvedValue(rows);

      await expect(service.getStatement(1, from, to)).resolves.toBe(rows);
      expect(transactionsRepository.getStatement).toHaveBeenCalledWith(1, from, to);
    });
  });
});
