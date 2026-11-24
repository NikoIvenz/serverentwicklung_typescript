import { drizzle } from 'drizzle-orm/node-postgres';
import process from 'node:process';
import { readFile } from 'node:fs/promises';
import { relations } from './db/relations.mts';

const { DATABASE_URL } = process.env;
if (DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL is not set');
}

const LIMIT = 2;
const INDENT = 2;

const db = drizzle({
    connection: {
        connectionString: DATABASE_URL.split('?')[0] ?? DATABASE_URL,
        ssl: { ca: await readFile(new URL('config/postgresql/server.crt', import.meta.url)) },
    },
    relations,
});

const autos = await db.query.autoTable.findMany({
    with: { kennzeichenTable: true, wartungTable: true },
    limit: LIMIT,
});
console.log(JSON.stringify(autos, null, INDENT));
await db.$client.end();
