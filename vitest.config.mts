import { defineConfig } from 'vitest/config';
import process from 'node:process';

// DATABASE_URL and CLIENT_SECRET come from .env; the server uses a self-signed certificate.
process.loadEnvFile();
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
    test: {
        include: ['test/integration/**/*.test.mts'],
        globalSetup: ['./test/integration/setup.global.mts'],
        // Test files share one database, so they run one after the other.
        fileParallelism: false,
    },
});
