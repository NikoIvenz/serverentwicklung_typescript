import { describe, expect, test } from 'vitest';
import { STATUS } from '../../../src/status.mts';
import { client } from './client.mts';

const SEED_ID = 1;

describe('GET /rest/:id', () => {
    test('returns a vehicle with plate, maintenance records and ETag', async () => {
        const { status, headers, data } = await client.get(`/${SEED_ID}`);

        expect(status).toBe(STATUS.ok);
        expect(headers['etag']).toBe('"0"');
        expect(data).toMatchObject({ id: SEED_ID, marke: 'VOLKSWAGEN' });
        expect(data.kennzeichen).toMatchObject({ kombination: 'B-AB 1000' });
        expect(data.wartungen.length).toBeGreaterThan(0);
        expect(data.version).toBeUndefined();
    });

    test('answers 304 if If-None-Match contains the current version', async () => {
        const { status, data } = await client.get(`/${SEED_ID}`, {
            headers: { 'If-None-Match': '"0"' },
        });

        expect(status).toBe(STATUS.notModified);
        expect(data).toBe('');
    });

    test('answers 200 if If-None-Match contains an old version', async () => {
        const { status } = await client.get(`/${SEED_ID}`, {
            headers: { 'If-None-Match': '"99"' },
        });

        expect(status).toBe(STATUS.ok);
    });

    test.each(['1abc', 'abc', '99999999999'])('answers 404 for the invalid id %s', async (id) => {
        const { status } = await client.get(`/${id}`);

        expect(status).toBe(STATUS.notFound);
    });

    test('answers 404 as Problem Details for an unknown id', async () => {
        const { status, headers, data } = await client.get('/999999');

        expect(status).toBe(STATUS.notFound);
        expect(headers['content-type']).toContain('application/problem+json');
        expect(data).toMatchObject({ status: STATUS.notFound, title: 'Not Found' });
    });
});

describe('GET /rest', () => {
    test('searches by brand, ignoring case', async () => {
        expect.hasAssertions();
        const { status, data } = await client.get('', { params: { marke: 'bmw' } });

        expect(status).toBe(STATUS.ok);
        expect(data.length).toBeGreaterThan(0);
        for (const auto of data) {
            expect(auto.marke.toLowerCase()).toContain('bmw');
        }
    });

    test.each(['_', '%', 'b_w'])(
        'treats the wildcard characters in %s literally',
        async (marke) => {
            const { data } = await client.get('', { params: { marke } });

            expect(data).toHaveLength(0);
        },
    );

    test('searches by FIN exactly', async () => {
        const { data } = await client.get('', { params: { fin: 'WVWZZZ1JZXW000001' } });

        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(SEED_ID);
    });
});
