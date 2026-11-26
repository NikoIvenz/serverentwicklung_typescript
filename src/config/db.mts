import { drizzle } from 'drizzle-orm/node-postgres';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { relations } from '../db/relations.mts';

const { DATABASE_URL } = process.env;
if (DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL is not set');
}

/** Drizzle client with a connection pool; the TLS certificate is the one of the DB container. */
export const db = drizzle({
    connection: {
        // The query string of DATABASE_URL is only meant for drizzle-kit.
        connectionString: DATABASE_URL.split('?')[0] ?? DATABASE_URL,
        ssl: { ca: await readFile(new URL('postgresql/server.crt', import.meta.url)) },
    },
    relations,
});
