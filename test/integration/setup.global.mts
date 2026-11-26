import { TEST_PORT } from './constants.mts';
import process from 'node:process';

/** Starts the application server once for all test files; the returned function stops it. */
export const setup = async () => {
    // The port is read when the config module is imported, so set it before the import.
    process.env['PORT'] = `${TEST_PORT}`;
    const { startServer } = await import('../../src/server.mts');
    const { db } = await import('../../src/config/db.mts');
    const server = await startServer();

    return async () => {
        server.close();
        await db.$client.end();
    };
};
