import { Module } from '@nestjs/common';
import { AccountsController } from './controller/accounts.controller';
import { AccountsService } from './service/accounts.service';
import { AccountsRepository } from './repository/accounts.repository';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { PessoasModule } from '../pessoas/pessoas.module';

@Module({
  imports: [PessoasModule], // Importing PessoasModule to use PessoasService
  controllers: [AccountsController],
  providers: [
    PrismaService,
    AccountsRepository,
    AccountsService,
  ],
  exports: [AccountsService, AccountsRepository], // Exporting for future use in TransactionsModule
})
export class AccountsModule {}
