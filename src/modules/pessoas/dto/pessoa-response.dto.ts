import { Exclude, Expose, Transform } from 'class-transformer';
import { Pessoa } from '../entity/pessoa.entity';

@Exclude()
export class PessoaResponseDto {
  @Expose()
  personId: number;

  @Expose()
  name: string;

  @Expose()
  @Transform(({ obj }: { obj: Pessoa }) => obj.document.value)
  document: string;

  @Expose()
  birthDate: Date;

  constructor(partial: Partial<Pessoa>) {
    Object.assign(this, partial);
  }
}
