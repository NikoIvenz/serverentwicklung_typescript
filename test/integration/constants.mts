/** The tests start their own server on this port, so a development server can keep running. */
export const TEST_PORT = 3001;

export const baseURL = `https://localhost:${TEST_PORT}`;
export const restURL = `${baseURL}/rest`;

export const KEYCLOAK_TOKEN_URL =
    'http://localhost:8880/realms/javascript/protocol/openid-connect/token';
