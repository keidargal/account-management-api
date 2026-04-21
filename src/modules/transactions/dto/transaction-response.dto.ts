import { Exclude, Expose, Transform } from 'class-transformer';
import { Transaction } from '../entity/transaction.entity';

@Exclude()
export class TransactionResponseDto {
  @Expose()
  transactionId: number;

  @Expose()
  accountId: number;

  @Expose()
  @Transform(({ obj }) => obj.value.toNumber())
  value: number;

  @Expose()
  transactionDate: Date;

  constructor(partial: Partial<Transaction>) {
    Object.assign(this, partial);
  }
}
