import { Injectable } from '@nestjs/common';
import { Account } from '../entity/account.entity';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Account as PrismaAccount } from '@prisma/client';

@Injectable()
export class AccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Maps a Prisma Data Model to our Rich Domain Entity.
   * Centralizes the mapping logic to adhere to DRY principles.
   */
  private mapToDomain(model: PrismaAccount): Account {
    return Account.load({
      accountId: model.accountId,
      personId: model.personId,
      balance: model.balance,
      dailyWithdrawalLimit: model.dailyWithdrawealLimit,
      activeFlag: model.activeFlag,
      accountType: model.accountType,
      createDate: model.createDate,
    });
  }

  /**
   * Saves a newly created Account entity to the database.
   */
  async create(account: Account): Promise<Account> {
    const createdModel = await this.prisma.account.create({
      data: {
        personId: account.personId,
        balance: account.balance, // Prisma automatically handles Decimal.js
        dailyWithdrawealLimit: account.dailyWithdrawalLimit, // Note: using the exact schema field name
        activeFlag: account.isActive,
        accountType: account.accountType,
        createDate: account.createDate,
      },
    });

    return this.mapToDomain(createdModel);
  }

  /**
   * Finds an Account by its ID and reconstructs the Domain Entity.
   */
  async findById(accountId: number): Promise<Account | null> {
    const model = await this.prisma.account.findUnique({
      where: { accountId },
    });

    if (!model) return null;

    return this.mapToDomain(model);
  }

  /**
   * Updates an existing Account in the database.
   * Useful after deposit, withdraw, or block operations.
   */
  async update(account: Account): Promise<Account> {
    const updatedModel = await this.prisma.account.update({
      where: { accountId: account.accountId },
      data: {
        balance: account.balance,
        activeFlag: account.isActive,
        // We generally don't update personId, accountType, or createDate
      },
    });

    return this.mapToDomain(updatedModel);
  }
}
