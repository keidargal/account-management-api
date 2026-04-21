import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { AccountsService } from '../service/accounts.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { AccountResponseDto } from '../dto/account-response.dto';

@Controller('accounts')
@UseInterceptors(ClassSerializerInterceptor)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Creates a new account for a person
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    const account = await this.accountsService.createAccount({
      personId: createAccountDto.personId,
      dailyWithdrawalLimit: createAccountDto.dailyWithdrawalLimit,
      accountType: createAccountDto.accountType,
    });

    return new AccountResponseDto(account);
  }

  /**
   * Retrieves the balance of a specific account
   */
  @Get(':accountId/balance')
  async getBalance(@Param('accountId', ParseIntPipe) accountId: number) {
    const balance = await this.accountsService.getAccountBalance(accountId);

    return {
      accountId,
      balance,
    };
  }

  /**
   * Blocks a specific account
   */
  @Patch(':accountId/block')
  async blockAccount(
    @Param('accountId', ParseIntPipe) accountId: number,
  ): Promise<AccountResponseDto> {
    const account = await this.accountsService.blockAccount(accountId);

    return new AccountResponseDto(account);
  }
}
