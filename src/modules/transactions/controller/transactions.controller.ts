import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { TransactionsService } from '../service/transactions.service';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { StatementQueryDto } from '../dto/statement-query.dto';
import { TransactionResponseDto } from '../dto/transaction-response.dto';

@Controller('transactions')
@UseInterceptors(ClassSerializerInterceptor)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Performs a deposit operation on an account
   */
  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  async deposit(
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.deposit(
      dto.accountId,
      dto.value,
    );
    return new TransactionResponseDto(transaction);
  }

  /**
   * Performs a withdrawal operation on an account
   */
  @Post('withdraw')
  @HttpCode(HttpStatus.CREATED)
  async withdraw(
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionsService.withdraw(
      dto.accountId,
      dto.value,
    );
    return new TransactionResponseDto(transaction);
  }

  /**
   * Retrieves the account statement of transactions by period
   */
  @Get('statement/:accountId')
  async getStatement(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query() query: StatementQueryDto,
  ): Promise<TransactionResponseDto[]> {
    // Default to a very old date (Unix Epoch) if fromDate is not provided
    const fromDate = query.fromDate ? new Date(query.fromDate) : new Date(0);

    // Default to current date/time if toDate is not provided
    const toDate = query.toDate ? new Date(query.toDate) : new Date();

    const transactions = await this.transactionsService.getStatement(
      accountId,
      fromDate,
      toDate,
    );

    return transactions.map((t) => new TransactionResponseDto(t));
  }
}
