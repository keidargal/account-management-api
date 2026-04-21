import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from '../repository/accounts.repository';
import { PessoasService } from '../../pessoas/service/pessoas.service';
import { Account } from '../entity/account.entity';
import { Decimal } from 'decimal.js';

describe('AccountsService (Application)', () => {
  let service: AccountsService;
  let accountsRepository: jest.Mocked<
    Pick<AccountsRepository, 'findById' | 'create' | 'update'>
  >;
  let pessoasService: jest.Mocked<Pick<PessoasService, 'checkIfExists'>>;

  const activeAccount = () =>
    Account.load({
      accountId: 10,
      personId: 1,
      balance: new Decimal(500),
      dailyWithdrawalLimit: new Decimal(1000),
      activeFlag: true,
      accountType: 1,
      createDate: new Date(),
    });

  beforeEach(async () => {
    const mockAccounts: jest.Mocked<
      Pick<AccountsRepository, 'findById' | 'create' | 'update'>
    > = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockPessoas: jest.Mocked<Pick<PessoasService, 'checkIfExists'>> = {
      checkIfExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: AccountsRepository, useValue: mockAccounts },
        { provide: PessoasService, useValue: mockPessoas },
      ],
    }).compile();

    service = module.get(AccountsService);
    accountsRepository = module.get(AccountsRepository);
    pessoasService = module.get(PessoasService);
  });

  describe('createAccount', () => {
    it('should throw when person does not exist', async () => {
      pessoasService.checkIfExists.mockResolvedValue(false);

      await expect(
        service.createAccount({
          personId: 5,
          dailyWithdrawalLimit: 100,
          accountType: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createAccount({
          personId: 5,
          dailyWithdrawalLimit: 100,
          accountType: 1,
        }),
      ).rejects.toThrow('Person with ID 5 not found');
      expect(accountsRepository.create).not.toHaveBeenCalled();
    });

    it('should create account when person exists', async () => {
      pessoasService.checkIfExists.mockResolvedValue(true);
      const persisted = activeAccount();
      accountsRepository.create.mockResolvedValue(persisted);

      const result = await service.createAccount({
        personId: 1,
        dailyWithdrawalLimit: 1000,
        accountType: 1,
      });

      expect(pessoasService.checkIfExists).toHaveBeenCalledWith(1);
      expect(accountsRepository.create).toHaveBeenCalledTimes(1);
      expect(result.accountId).toBe(10);
    });
  });

  describe('getAccountBalance', () => {
    it('should throw when account is missing', async () => {
      accountsRepository.findById.mockResolvedValue(null);

      await expect(service.getAccountBalance(1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return numeric balance', async () => {
      accountsRepository.findById.mockResolvedValue(activeAccount());

      await expect(service.getAccountBalance(10)).resolves.toBe(500);
    });
  });

  describe('blockAccount', () => {
    it('should throw when account is missing', async () => {
      accountsRepository.findById.mockResolvedValue(null);

      await expect(service.blockAccount(2)).rejects.toThrow(NotFoundException);
      expect(accountsRepository.update).not.toHaveBeenCalled();
    });

    it('should block and persist', async () => {
      const account = activeAccount();
      accountsRepository.findById.mockResolvedValue(account);
      accountsRepository.update.mockImplementation(async (a) => a);

      const result = await service.blockAccount(10);

      expect(result.isActive).toBe(false);
      expect(accountsRepository.update).toHaveBeenCalledTimes(1);
      const updatedArg = accountsRepository.update.mock.calls[0][0];
      expect(updatedArg.isActive).toBe(false);
    });
  });
});
