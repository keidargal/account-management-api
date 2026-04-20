import { Module } from '@nestjs/common';
import { PessoasController } from './controller/pessoas.controller';
import { PessoasService } from './service/pessoas.service';
import { PessoasRepository } from './repository/pessoas.repository';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';

@Module({
  controllers: [PessoasController],
  providers: [
    PrismaService,
    PessoasRepository,
    PessoasService,
  ],
  exports: [PessoasService],
})
export class PessoasModule {}
