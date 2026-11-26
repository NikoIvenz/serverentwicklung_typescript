import { app } from './app.mts';
import { config } from './config/config.mts';
import { createSecureServer } from 'node:http2';
import { readFile } from 'node:fs/promises';
import { serve } from '@hono/node-server';

/** Starts the HTTP/2 server with TLS; allowHTTP1 keeps curl and browsers without HTTP/2 working. */
export const startServer = async () => {
    const { port, keyFile, certFile } = config.server;
    const { fetch } = app;
    return serve(
        {
            fetch,
            port,
            createServer: createSecureServer,
            serverOptions: {
                key: await readFile(keyFile),
                cert: await readFile(certFile),
                allowHTTP1: true,
            },
        },
        (info) => {
            console.log(`Server started: https://localhost:${info.port}`);
        },
    );
};
