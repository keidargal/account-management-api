import { PrismaClient } from '@prisma/client';

/**
 * Deletes rows in FK-safe order so each integration test starts from a clean slate.
 * Option A (truncate via deleteMany): simple, explicit, works well with Jest + HTTP tests.
 */
export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction([
    prisma.transaction.deleteMany(),
    prisma.account.deleteMany(),
    prisma.pessoa.deleteMany(),
  ]);
}
