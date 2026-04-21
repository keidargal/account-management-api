import { IsInt, IsPositive, Min, IsNumber } from 'class-validator';

export class CreateAccountDto {
  @IsInt()
  @IsPositive()
  personId: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  dailyWithdrawalLimit: number;

  @IsInt()
  accountType: number;
}
