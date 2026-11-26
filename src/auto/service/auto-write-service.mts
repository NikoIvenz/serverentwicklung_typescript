import { type AutoInput, type AutoUpdateInput } from '../router/auto-schema.mts';
import { FinExistsError, NotFoundError, VersionOutdatedError } from './errors.mts';
import { and, eq, sql } from 'drizzle-orm';
import { autoTable, kennzeichenTable, wartungTable } from '../../db/schema.mts';
import { db } from '../../config/db.mts';

const UNIQUE_VIOLATION = '23505';

const finExists = async (fin: string, exceptId?: number) => {
    const found = await db.query.autoTable.findFirst({
        where: exceptId === undefined ? { fin } : { fin, id: { ne: exceptId } },
        columns: { id: true },
    });
    return found !== undefined;
};

/** Creates a vehicle with license plate and maintenance records in one transaction. */
export const create = async ({
    kennzeichen,
    wartungen,
    ...auto
}: AutoInput): Promise<{ id: number; version: number }> => {
    if (await finExists(auto.fin)) {
        throw new FinExistsError(`FIN ${auto.fin} already exists`);
    }

    try {
        return await db.transaction(async (tx) => {
            const [created] = await tx
                .insert(autoTable)
                .values(auto)
                .returning({ id: autoTable.id, version: autoTable.version });
            if (created === undefined) {
                throw new Error('INSERT returned no row');
            }
            await tx.insert(kennzeichenTable).values({ ...kennzeichen, autoId: created.id });
            if (wartungen.length > 0) {
                await tx.insert(wartungTable).values(
                    wartungen.map((wartung) => {
                        return { ...wartung, autoId: created.id };
                    }),
                );
            }
            return created;
        });
    } catch (error) {
        // Concurrent request with the same FIN: the UNIQUE constraint decides.
        if ((error as { cause?: { code?: string } }).cause?.code === UNIQUE_VIOLATION) {
            throw new FinExistsError(`FIN ${auto.fin} already exists`, { cause: error });
        }
        throw error;
    }
};

/**
 * Updates the master data of a vehicle if `version` is still current (no lost updates).
 * @returns the new version
 */
export const update = async (
    id: number,
    version: number,
    { farbe, ...fields }: AutoUpdateInput,
): Promise<number> => {
    const current = await db.query.autoTable.findFirst({
        where: { id },
        columns: { version: true },
    });
    if (current === undefined) {
        throw new NotFoundError(`No vehicle with id ${id}`);
    }
    if (current.version !== version) {
        throw new VersionOutdatedError(`Version ${version} is outdated`);
    }
    if (await finExists(fields.fin, id)) {
        throw new FinExistsError(`FIN ${fields.fin} already exists`);
    }

    // The version in the WHERE clause also covers a change between the check above and the UPDATE.
    const rows = await db
        .update(autoTable)
        .set({ ...fields, farbe: farbe ?? null, version: sql`${autoTable.version} + 1` })
        .where(and(eq(autoTable.id, id), eq(autoTable.version, version)))
        .returning({ version: autoTable.version });
    const [updated] = rows;
    if (updated === undefined) {
        throw new VersionOutdatedError(`Version ${version} is outdated`);
    }
    return updated.version;
};
