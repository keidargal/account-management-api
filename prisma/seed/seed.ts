import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create a default Pessoa (Person) if it doesn't exist
  const defaultPessoa = await prisma.pessoa.upsert({
    where: { document: '12345678900' },
    update: {},
    create: {
      name: 'John Doe',
      document: '12345678900',
      birthDate: new Date('1990-01-01'),
    },
  });

  console.log(`Created default Pessoa with id: ${defaultPessoa.personId}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
