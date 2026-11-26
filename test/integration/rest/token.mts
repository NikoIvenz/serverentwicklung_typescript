import { KEYCLOAK_TOKEN_URL } from '../constants.mts';
import axios from 'axios';
import process from 'node:process';

/** Fetches an access token from Keycloak (password grant, password `p` for all test users). */
export const getToken = async (username: 'admin' | 'user') => {
    const { CLIENT_SECRET } = process.env;
    if (CLIENT_SECRET === undefined || CLIENT_SECRET === '') {
        throw new Error('CLIENT_SECRET is not set in .env');
    }

    const { data } = await axios.post<{ access_token: string }>(
        KEYCLOAK_TOKEN_URL,
        new URLSearchParams({
            grant_type: 'password',
            client_id: 'javascript-client',
            client_secret: CLIENT_SECRET,
            username,
            password: 'p',
        }),
    );
    return data.access_token;
};

/** Authorization header for a token. */
export const bearer = (token: string) => {
    return { Authorization: `Bearer ${token}` };
};
