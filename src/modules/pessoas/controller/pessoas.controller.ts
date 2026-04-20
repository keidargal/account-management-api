import { Controller, Post, Body, Get, Param, ParseIntPipe, UseInterceptors, ClassSerializerInterceptor } from '@nestjs/common';
import { PessoasService } from '../service/pessoas.service';
import { CreatePessoaDto } from '../dto/create-pessoa.dto';
import { PessoaResponseDto } from '../dto/pessoa-response.dto';

@Controller('pessoas')
@UseInterceptors(ClassSerializerInterceptor)
export class PessoasController {
  constructor(
    private readonly pessoasService: PessoasService,
  ) {}

  @Post()
  async create(@Body() createPessoaDto: CreatePessoaDto): Promise<PessoaResponseDto> {
    const pessoa = await this.pessoasService.createPessoa({
      name: createPessoaDto.name,
      document: createPessoaDto.document,
      birthDate: new Date(createPessoaDto.birthDate),
    });

    return new PessoaResponseDto(pessoa);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<PessoaResponseDto> {
    const pessoa = await this.pessoasService.getPessoa(id);
    
    return new PessoaResponseDto(pessoa);
  }
}
