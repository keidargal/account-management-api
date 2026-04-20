import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PessoasRepository } from '../repository/pessoas.repository';
import { Pessoa } from '../entity/pessoa.entity';

@Injectable()
export class PessoasService {
  constructor(
    private readonly pessoasRepository: PessoasRepository,
  ) {}

  async createPessoa(data: { name: string; document: string; birthDate: Date }): Promise<Pessoa> {
    // Check if document already exists
    const existingPessoa = await this.pessoasRepository.findByDocument(data.document);
    if (existingPessoa) {
      throw new BadRequestException('Person with this document already exists');
    }

    // Create the entity (this will validate the document format via the Value Object)
    let pessoaEntity: Pessoa;
    try {
      pessoaEntity = Pessoa.create({
        personId: 0, // 0 because it's not created yet, DB will assign real ID
        name: data.name,
        document: data.document,
        birthDate: data.birthDate,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    // Persist to DB
    return this.pessoasRepository.create(pessoaEntity);
  }

  async getPessoa(personId: number): Promise<Pessoa> {
    const pessoa = await this.pessoasRepository.findById(personId);
    
    if (!pessoa) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }

    return pessoa;
  }
}
