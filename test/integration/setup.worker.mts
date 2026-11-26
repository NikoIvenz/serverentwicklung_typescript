import { afterAll } from 'vitest';
import { db } from '../../src/config/db.mts';

// Every test file runs in its own worker with its own connection pool.
afterAll(async () => {
    await db.$client.end();
});
