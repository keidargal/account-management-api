import { Module } from '@nestjs/common';
import { PessoasModule } from './modules/pessoas/pessoas.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

@Module({
  imports: [PessoasModule, AccountsModule, TransactionsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
