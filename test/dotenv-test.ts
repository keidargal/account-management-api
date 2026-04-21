import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Integration tests must target a dedicated database (never production).
 * Copy `.env.test.example` → `.env.test` and run migrations against that URL.
 */
config({ path: resolve(__dirname, '../.env.test'), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Integration tests require DATABASE_URL. Create `.env.test` from `.env.test.example`.',
  );
}
