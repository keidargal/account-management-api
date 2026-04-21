import { Exclude, Expose } from 'class-transformer';
import { Account } from '../entity/account.entity';

@Exclude()
export class AccountResponseDto {
  @Expose()
  accountId: number;

  @Expose()
  personId: number;

  @Expose()
  balance: number;

  @Expose()
  dailyWithdrawalLimit: number;

  @Expose()
  activeFlag: boolean;

  @Expose()
  accountType: number;

  @Expose()
  createDate: Date;

  constructor(account: Account) {
    this.accountId = account.accountId;
    this.personId = account.personId;
    this.balance = account.balance.toNumber();
    this.dailyWithdrawalLimit = account.dailyWithdrawalLimit.toNumber();
    this.activeFlag = account.isActive;
    this.accountType = account.accountType;
    this.createDate = account.createDate;
  }
}
