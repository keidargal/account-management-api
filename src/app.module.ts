import { Module } from '@nestjs/common';
import { PessoasModule } from './modules/pessoas/pessoas.module';
import { AccountsModule } from './modules/accounts/accounts.module';

@Module({
  imports: [PessoasModule, AccountsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
