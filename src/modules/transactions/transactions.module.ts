import { Module } from '@nestjs/common';
import { TransactionsController } from './controller/transactions.controller';
import { TransactionsService } from './service/transactions.service';
import { TransactionsRepository } from './repository/transactions.repository';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule], // Importing AccountsModule to use AccountsRepository
  controllers: [TransactionsController],
  providers: [TransactionsRepository, TransactionsService],
})
export class TransactionsModule {}
