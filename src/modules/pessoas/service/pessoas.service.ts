import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PessoasRepository } from '../repository/pessoas.repository';
import { Pessoa } from '../entity/pessoa.entity';
import { Document } from '../entity/document.value-object';

@Injectable()
export class PessoasService {
  constructor(private readonly pessoasRepository: PessoasRepository) {}

  async createPessoa(data: {
    name: string;
    document: string;
    birthDate: Date;
  }): Promise<Pessoa> {
    // 1. Let the Value Object handle normalization and validation
    // Throws DomainException if invalid before hitting the DB
    const documentVo = Document.create(data.document);

    // 2. Check if document already exists using the normalized value
    const existingPessoa = await this.pessoasRepository.findByDocument(
      documentVo.value,
    );
    if (existingPessoa) {
      throw new BadRequestException('Person with this document already exists');
    }

    // 3. Create the entity using the normalized value
    // We don't need a try-catch here anymore because DomainException
    // is automatically handled by the GlobalExceptionFilter!
    const pessoaEntity = Pessoa.create({
      personId: 0, // 0 because it's not created yet, DB will assign real ID
      name: data.name,
      document: documentVo.value,
      birthDate: data.birthDate,
    });

    // 4. Persist to DB
    return this.pessoasRepository.create(pessoaEntity);
  }

  async getPessoa(personId: number): Promise<Pessoa> {
    const pessoa = await this.pessoasRepository.findById(personId);

    if (!pessoa) {
      throw new NotFoundException(`Person with ID ${personId} not found`);
    }

    return pessoa;
  }

  /**
   * Fast check if a person exists without loading the full entity.
   */
  async checkIfExists(personId: number): Promise<boolean> {
    return this.pessoasRepository.checkIfExists(personId);
  }
}
