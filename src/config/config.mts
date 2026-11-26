import process from 'node:process';

const DEFAULT_PORT = 3000;
const DEFAULT_KEYCLOAK_URL = 'http://localhost:8880';

const { PORT, KEYCLOAK_URL } = process.env;

/** Settings of the application server. */
export const config = {
    server: {
        port: PORT === undefined ? DEFAULT_PORT : Number.parseInt(PORT, 10),
        keyFile: new URL('tls/key.pem', import.meta.url),
        certFile: new URL('tls/certificate.crt', import.meta.url),
    },
    // Realm and client that issue and own the access tokens.
    keycloak: {
        url: KEYCLOAK_URL ?? DEFAULT_KEYCLOAK_URL,
        realm: 'javascript',
        clientId: 'javascript-client',
    },
} as const;
