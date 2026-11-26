import { createAuto, newAuto, removeAuto } from './test-data.mts';
import { describe, expect, test } from 'vitest';
import { STATUS } from '../../../src/status.mts';
import { client } from './client.mts';

describe('PUT /rest/:id', () => {
    test('updates a vehicle and increments the version', async () => {
        const { auto, path } = await createAuto();

        const put = await client.put(
            path,
            { ...auto, modell: 'Model Y' },
            {
                headers: { 'If-Match': '"0"' },
            },
        );

        expect(put.status).toBe(STATUS.noContent);
        expect(put.headers['etag']).toBe('"1"');
        const { data, headers } = await client.get(path);
        expect(data.modell).toBe('Model Y');
        expect(headers['etag']).toBe('"1"');
        await removeAuto(path);
    });

    test('rejects a lost update with 412', async () => {
        const { auto, path } = await createAuto();
        await client.put(path, { ...auto, modell: 'First' }, { headers: { 'If-Match': '"0"' } });

        const { status } = await client.put(
            path,
            { ...auto, modell: 'Second' },
            {
                headers: { 'If-Match': '"0"' },
            },
        );

        expect(status).toBe(STATUS.preconditionFailed);
        const { data } = await client.get(path);
        expect(data.modell).toBe('First');
        await removeAuto(path);
    });
});

describe('PUT /rest/:id with invalid requests', () => {
    test('answers 428 without If-Match', async () => {
        const { auto, path } = await createAuto();

        const { status } = await client.put(path, auto);

        expect(status).toBe(STATUS.preconditionRequired);
        await removeAuto(path);
    });

    test('answers 412 if If-Match is not a version', async () => {
        const { auto, path } = await createAuto();

        const { status } = await client.put(path, auto, { headers: { 'If-Match': 'abc' } });

        expect(status).toBe(STATUS.preconditionFailed);
        await removeAuto(path);
    });

    test('answers 422 for an invalid body', async () => {
        const { auto, path } = await createAuto();

        const { status } = await client.put(
            path,
            { ...auto, marke: '' },
            {
                headers: { 'If-Match': '"0"' },
            },
        );

        expect(status).toBe(STATUS.unprocessable);
        await removeAuto(path);
    });

    test('answers 404 for an unknown id', async () => {
        const { status } = await client.put('/999999', newAuto(), {
            headers: { 'If-Match': '"0"' },
        });

        expect(status).toBe(STATUS.notFound);
    });
});
