import { Exclude, Expose } from 'class-transformer';
import { Transaction } from '../entity/transaction.entity';

@Exclude()
export class TransactionResponseDto {
  @Expose()
  transactionId: number;

  @Expose()
  accountId: number;

  @Expose()
  value: number;

  @Expose()
  transactionDate: Date;

  constructor(transaction: Transaction) {
    this.transactionId = transaction.transactionId;
    this.accountId = transaction.accountId;
    this.value = transaction.value.toNumber();
    this.transactionDate = transaction.transactionDate;
  }
}
