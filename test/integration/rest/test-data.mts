import { bearer, getToken } from './token.mts';
import { autoTable } from '../../../src/db/schema.mts';
import { client } from './client.mts';
import { db } from '../../../src/config/db.mts';
import { eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';

const DATE_DIGITS = 8;
const SUFFIX_DIGITS = 6;
const SUFFIX_RANGE = 1_000_000;

// 17 characters, unique per call, so tests never collide with each other or with the seed data
const uniqueFin = () =>
    `TST${Date.now().toString().slice(-DATE_DIGITS)}${randomInt(SUFFIX_RANGE).toString().padStart(SUFFIX_DIGITS, '0')}`;

/** Request body for POST with a new, unique FIN. */
export const newAuto = () => {
    return {
        fin: uniqueFin(),
        marke: 'TESLA',
        modell: 'Model 3',
        farbe: 'WEISS',
        kennzeichen: { kombination: 'KA-TS 123', ausstellungsdatum: '2026-02-01' },
        wartungen: [{ beschreibung: 'Inspektion', kosten: '99.90' }],
    };
};

/** Creates a vehicle as admin and returns its path (e.g. `/1003`) for further requests. */
export const createAuto = async (auto = newAuto()) => {
    const { headers } = await client.post('', auto, { headers: bearer(await getToken('admin')) });
    const location = String(headers['location']);
    return { auto, path: location.slice(location.lastIndexOf('/')) };
};

/** Deletes a test vehicle directly in the DB; the REST interface has no DELETE. */
export const removeAuto = async (pathOrLocation: string) => {
    const id = Number(pathOrLocation.slice(pathOrLocation.lastIndexOf('/') + 1));
    await db.delete(autoTable).where(eq(autoTable.id, id));
};
