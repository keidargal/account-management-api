import { Pessoa } from './pessoa.entity';

export const PESSOAS_REPOSITORY = 'PESSOAS_REPOSITORY';

export interface PessoasRepository {
  findById(personId: number): Promise<Pessoa | null>;
  findByDocument(document: string): Promise<Pessoa | null>;
  create(pessoa: Omit<Pessoa, 'personId'>): Promise<Pessoa>;
}
