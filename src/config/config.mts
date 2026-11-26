import process from 'node:process';

const DEFAULT_PORT = 3000;
const DEFAULT_KEYCLOAK_URL = 'http://localhost:8880';

const MAX_PORT = 65_535;

const { PORT, KEYCLOAK_URL } = process.env;

// Fail at startup with a clear message instead of listening on an arbitrary port.
const parsePort = (value: string | undefined) => {
    if (value === undefined) {
        return DEFAULT_PORT;
    }
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > MAX_PORT) {
        throw new Error(`PORT must be an integer between 1 and ${MAX_PORT}, but is "${value}"`);
    }
    return port;
};

/** Settings of the application server. */
export const config = {
    server: {
        port: parsePort(PORT),
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
