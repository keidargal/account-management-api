import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

export class CreatePessoaDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsDateString()
  @IsNotEmpty()
  birthDate: string;
}
