import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import process from 'node:process';

const { DATABASE_URL } = process.env;
if (DATABASE_URL === undefined) {
    throw new Error('DATABASE_URL is not set in .env');
}

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    dialect: 'postgresql',
    dbCredentials: { url: DATABASE_URL },
    schemaFilter: ['auto'],
    // Pull output goes here to keep the reference folder `drizzle/` untouched.
    out: './drizzle-out',
    // for Drizzle Studio
    schema: 'src/db/schema.mts',
});
