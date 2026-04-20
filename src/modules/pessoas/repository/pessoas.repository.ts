import { Injectable } from '@nestjs/common';
import { Pessoa } from '../entity/pessoa.entity';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class PessoasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(personId: number): Promise<Pessoa | null> {
    const pessoaModel = await this.prisma.pessoa.findUnique({
      where: { personId },
    });

    if (!pessoaModel) return null;

    return Pessoa.create({
      personId: pessoaModel.personId,
      name: pessoaModel.name,
      document: pessoaModel.document,
      birthDate: pessoaModel.birthDate,
    });
  }

  async findByDocument(document: string): Promise<Pessoa | null> {
    const pessoaModel = await this.prisma.pessoa.findUnique({
      where: { document },
    });

    if (!pessoaModel) return null;

    return Pessoa.create({
      personId: pessoaModel.personId,
      name: pessoaModel.name,
      document: pessoaModel.document,
      birthDate: pessoaModel.birthDate,
    });
  }

  /**
   * Checks if a Person exists in the database by ID.
   * Optimized query that only returns a boolean, not the full record.
   */
  async checkIfExists(personId: number): Promise<boolean> {
    const count = await this.prisma.pessoa.count({
      where: { personId },
    });
    return count > 0;
  }

  async create(pessoa: Omit<Pessoa, 'personId'>): Promise<Pessoa> {
    const createdModel = await this.prisma.pessoa.create({
      data: {
        name: pessoa.name,
        document: pessoa.document.value,
        birthDate: pessoa.birthDate,
      },
    });

    return Pessoa.create({
      personId: createdModel.personId,
      name: createdModel.name,
      document: createdModel.document,
      birthDate: createdModel.birthDate,
    });
  }
}
