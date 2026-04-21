import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PessoasService } from './pessoas.service';
import { PessoasRepository } from '../repository/pessoas.repository';
import { Pessoa } from '../entity/pessoa.entity';

describe('PessoasService (Application)', () => {
  let service: PessoasService;
  let repository: jest.Mocked<
    Pick<
      PessoasRepository,
      'findByDocument' | 'findById' | 'create' | 'checkIfExists'
    >
  >;

  const validInput = () => ({
    name: 'Test User',
    document: '12345678901',
    birthDate: new Date('1990-05-15'),
  });

  beforeEach(async () => {
    const mockRepository: jest.Mocked<
      Pick<
        PessoasRepository,
        'findByDocument' | 'findById' | 'create' | 'checkIfExists'
      >
    > = {
      findByDocument: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      checkIfExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PessoasService,
        { provide: PessoasRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get(PessoasService);
    repository = module.get(PessoasRepository);
  });

  describe('createPessoa', () => {
    it('should reject when document already exists', async () => {
      const existing = Pessoa.create({
        personId: 1,
        name: 'Other',
        document: '12345678901',
        birthDate: new Date(),
      });
      repository.findByDocument.mockResolvedValue(existing);

      await expect(service.createPessoa(validInput())).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createPessoa(validInput())).rejects.toThrow(
        'Person with this document already exists',
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should create and persist when document is new', async () => {
      repository.findByDocument.mockResolvedValue(null);
      const created = Pessoa.create({
        personId: 42,
        name: validInput().name,
        document: validInput().document,
        birthDate: validInput().birthDate,
      });
      repository.create.mockResolvedValue(created);

      const result = await service.createPessoa(validInput());

      expect(repository.findByDocument).toHaveBeenCalledWith('12345678901');
      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(result.personId).toBe(42);
    });
  });

  describe('getPessoa', () => {
    it('should throw when person is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getPessoa(99)).rejects.toThrow(NotFoundException);
      await expect(service.getPessoa(99)).rejects.toThrow(
        'Person with ID 99 not found',
      );
    });

    it('should return the person when found', async () => {
      const pessoa = Pessoa.create({
        personId: 7,
        name: 'A',
        document: '98765432109',
        birthDate: new Date(),
      });
      repository.findById.mockResolvedValue(pessoa);

      await expect(service.getPessoa(7)).resolves.toBe(pessoa);
    });
  });

  describe('checkIfExists', () => {
    it('should delegate to the repository', async () => {
      repository.checkIfExists.mockResolvedValue(true);

      await expect(service.checkIfExists(3)).resolves.toBe(true);
      expect(repository.checkIfExists).toHaveBeenCalledWith(3);
    });
  });
});
