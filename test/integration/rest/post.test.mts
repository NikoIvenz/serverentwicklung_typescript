import { bearer, getToken } from './token.mts';
import { createAuto, newAuto } from './test-data.mts';
import { describe, expect, test } from 'vitest';
import { STATUS } from '../../../src/status.mts';
import { client } from './client.mts';

describe('POST /rest', () => {
    test('creates a vehicle as admin and answers 201 with Location', async () => {
        const auto = newAuto();
        const token = await getToken('admin');

        const { status, headers } = await client.post('', auto, { headers: bearer(token) });

        expect(status).toBe(STATUS.created);
        expect(headers['etag']).toBe('"0"');
        const location = String(headers['location']);
        expect(location).toMatch(/\/rest\/\d+$/u);

        const created = await client.get(location, { baseURL: '' });
        expect(created.data).toMatchObject({ fin: auto.fin, marke: 'TESLA' });
        expect(created.data.wartungen).toHaveLength(1);

        await client.delete(location, { baseURL: '' });
    });

    test('answers 401 without token', async () => {
        const { status, headers } = await client.post('', newAuto());

        expect(status).toBe(STATUS.unauthorized);
        expect(headers['content-type']).toContain('application/problem+json');
    });

    test('answers 403 for the role user', async () => {
        const { status } = await client.post('', newAuto(), {
            headers: bearer(await getToken('user')),
        });

        expect(status).toBe(STATUS.forbidden);
    });

    test('answers 422 for an invalid body', async () => {
        const { status, data } = await client.post(
            '',
            { ...newAuto(), fin: 'too-short' },
            { headers: bearer(await getToken('admin')) },
        );

        expect(status).toBe(STATUS.unprocessable);
        expect(data.detail).toContain('fin');
    });

    test('answers 422 if the FIN exists already', async () => {
        const { auto, path } = await createAuto();

        const { status } = await client.post('', auto, {
            headers: bearer(await getToken('admin')),
        });

        expect(status).toBe(STATUS.unprocessable);
        await client.delete(path);
    });
});
