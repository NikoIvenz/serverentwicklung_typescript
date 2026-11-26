import { describe, expect, test } from 'vitest';
import { STATUS } from '../../../src/status.mts';
import { client } from './client.mts';
import { createAuto } from './test-data.mts';

describe('DELETE /rest/:id', () => {
    test('deletes a vehicle with its plate and maintenance records', async () => {
        const { path } = await createAuto();

        const { status } = await client.delete(path);

        expect(status).toBe(STATUS.noContent);
        expect((await client.get(path)).status).toBe(STATUS.notFound);
    });

    test('is idempotent', async () => {
        const { status } = await client.delete('/999999');

        expect(status).toBe(STATUS.noContent);
    });
});
