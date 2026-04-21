import { Module } from '@nestjs/common';
import { PessoasController } from './controller/pessoas.controller';
import { PessoasService } from './service/pessoas.service';
import { PessoasRepository } from './repository/pessoas.repository';

@Module({
  controllers: [PessoasController],
  providers: [PessoasRepository, PessoasService],
  exports: [PessoasService],
})
export class PessoasModule {}
