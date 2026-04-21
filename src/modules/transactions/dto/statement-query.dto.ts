import { IsDateString, IsOptional } from 'class-validator';

export class StatementQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
