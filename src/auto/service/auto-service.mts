import { and, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../../config/db.mts';

/** Vehicle with license plate and maintenance records; `version` is sent as ETag only. */
export type AutoDto = Readonly<{
    id: number;
    version: number;
    fin: string;
    marke: string;
    modell: string;
    farbe: string | null;
    kennzeichen: Readonly<{ kombination: string; ausstellungsdatum: string }> | null;
    wartungen: readonly Readonly<{ beschreibung: string; kosten: string }>[];
}>;

/** Search criteria; every criterion is optional. */
export type SearchParams = Readonly<{
    marke?: string | undefined;
    fin?: string | undefined;
}>;

// Fetch both relations in one query to avoid N+1 lookups.
const findRow = (id: number) =>
    db.query.autoTable.findFirst({
        where: { id },
        with: { kennzeichenTable: true, wartungTable: true },
    });

const toDto = (row: NonNullable<Awaited<ReturnType<typeof findRow>>>): AutoDto => {
    const { id, version, fin, marke, modell, farbe, kennzeichenTable, wartungTable } = row;
    return {
        id,
        version,
        fin,
        marke,
        modell,
        farbe,
        kennzeichen:
            kennzeichenTable === null
                ? null
                : {
                      kombination: kennzeichenTable.kombination,
                      ausstellungsdatum: kennzeichenTable.ausstellungsdatum,
                  },
        wartungen: wartungTable.map(({ beschreibung, kosten }) => {
            return { beschreibung, kosten };
        }),
    };
};

/** Reads a vehicle including its license plate and maintenance records. */
export const findById = async (id: number): Promise<AutoDto | undefined> => {
    const row = await findRow(id);
    return row === undefined ? undefined : toDto(row);
};

/** Searches vehicles by brand (case-insensitive substring) and FIN (exact). */
export const find = async ({ marke, fin }: SearchParams): Promise<readonly AutoDto[]> => {
    const rows = await db.query.autoTable.findMany({
        // RQB aliases the table, so the condition is built from the table that is passed in.
        where: {
            RAW: (table) =>
                and(
                    marke === undefined ? undefined : ilike(table.marke, `%${marke}%`),
                    fin === undefined ? undefined : eq(table.fin, fin),
                ) ?? sql`true`,
        },
        with: { kennzeichenTable: true, wartungTable: true },
        orderBy: { id: 'asc' },
    });
    return rows.map((row) => toDto(row));
};
