import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PessoasService } from '../service/pessoas.service';
import { CreatePessoaDto } from '../dto/create-pessoa.dto';

@Controller('pessoas')
export class PessoasController {
  constructor(
    private readonly pessoasService: PessoasService,
  ) {}

  @Post()
  async create(@Body() createPessoaDto: CreatePessoaDto) {
    const pessoa = await this.pessoasService.createPessoa({
      name: createPessoaDto.name,
      document: createPessoaDto.document,
      birthDate: new Date(createPessoaDto.birthDate),
    });

    return {
      personId: pessoa.personId,
      name: pessoa.name,
      document: pessoa.document.value,
      birthDate: pessoa.birthDate,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const pessoa = await this.pessoasService.getPessoa(id);
    
    return {
      personId: pessoa.personId,
      name: pessoa.name,
      document: pessoa.document.value,
      birthDate: pessoa.birthDate,
    };
  }
}
