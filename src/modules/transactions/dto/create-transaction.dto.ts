import { IsInt, IsPositive, IsNumber } from 'class-validator';

export class CreateTransactionDto {
  @IsInt()
  @IsPositive()
  accountId: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  value: number;
}
