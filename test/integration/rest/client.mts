import axios from 'axios';
import { restURL } from '../constants.mts';

/** Axios client for HTTP/2; every status is returned, so tests can assert on error responses. */
export const client = axios.create({
    baseURL: restURL,
    httpVersion: 2,
    validateStatus: () => true,
});
