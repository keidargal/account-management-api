import { Module } from '@nestjs/common';
import { PessoasModule } from './modules/pessoas/pessoas.module';

@Module({
  imports: [PessoasModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
