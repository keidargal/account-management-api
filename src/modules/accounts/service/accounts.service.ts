import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountsRepository } from '../repository/accounts.repository';
import { Account } from '../entity/account.entity';
import { PessoasService } from '../../pessoas/service/pessoas.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accountsRepository: AccountsRepository,
    // Injecting PessoasService to validate if a person exists before creating an account
    private readonly pessoasService: PessoasService, 
  ) {}

  /**
   * Helper method to fetch an account or throw a NotFoundException.
   * Centralizes the "find or throw" logic to keep use cases clean.
   */
  private async getAccountOrThrow(accountId: number): Promise<Account> {
    const account = await this.accountsRepository.findById(accountId);
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found`);
    }
    return account;
  }

  /**
   * Use Case: Create a new Account
   */
  async createAccount(data: { personId: number; dailyWithdrawalLimit: number; accountType: number }): Promise<Account> {
    // 1. Cross-module validation: Ensure the Pessoa exists using the optimized check
    const personExists = await this.pessoasService.checkIfExists(data.personId);
    if (!personExists) {
      throw new NotFoundException(`Person with ID ${data.personId} not found`);
    }

    // 2. Create the Domain Entity
    // We don't need a try-catch here anymore because DomainException 
    // is automatically handled by the GlobalExceptionFilter!
    const accountEntity = Account.createNew({
      personId: data.personId,
      dailyWithdrawalLimit: data.dailyWithdrawalLimit,
      accountType: data.accountType,
    });

    // 3. Persist the new account to the database
    return this.accountsRepository.create(accountEntity);
  }

  /**
   * Use Case: Get Account Balance
   */
  async getAccountBalance(accountId: number): Promise<number> {
    const account = await this.getAccountOrThrow(accountId);
    
    // Convert Decimal to standard JavaScript number for the API response
    return account.balance.toNumber();
  }

  /**
   * Use Case: Block an Account
   */
  async blockAccount(accountId: number): Promise<Account> {
    // 1. Fetch the entity using our helper
    const account = await this.getAccountOrThrow(accountId);
    
    // 2. Delegate the business logic to the Rich Domain Model
    // We don't need a try-catch here anymore because DomainException 
    // is automatically handled by the GlobalExceptionFilter!
    account.block();

    // 3. Persist the updated state
    return this.accountsRepository.update(account);
  }
}
