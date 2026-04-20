import { Exclude, Expose, Transform } from 'class-transformer';
import { Account } from '../entity/account.entity';

@Exclude()
export class AccountResponseDto {
  @Expose()
  accountId: number;

  @Expose()
  personId: number;

  @Expose()
  @Transform(({ obj }) => obj.balance.toNumber())
  balance: number;

  @Expose()
  @Transform(({ obj }) => obj.dailyWithdrawalLimit.toNumber())
  dailyWithdrawalLimit: number;

  @Expose()
  activeFlag: boolean;

  @Expose()
  accountType: number;

  @Expose()
  createDate: Date;

  constructor(partial: Partial<Account>) {
    Object.assign(this, partial);
  }
}
