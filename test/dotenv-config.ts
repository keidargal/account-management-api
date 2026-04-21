import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * Load `.env` before any module imports DATABASE_URL (e.g. PrismaService).
 * Jest `setupFiles` run after the test framework is installed but before the test code.
 */
config({ path: resolve(__dirname, '../.env') });
