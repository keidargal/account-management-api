import { IsInt, IsPositive, Min } from 'class-validator';

export class CreateAccountDto {
  @IsInt()
  @IsPositive()
  personId: number;

  @IsInt()
  @Min(0)
  dailyWithdrawalLimit: number;

  @IsInt()
  accountType: number;
}
