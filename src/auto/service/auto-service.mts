import { and, eq, ilike, sql } from 'drizzle-orm';
import { autoTable } from '../../db/schema.mts';
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

/** Search criteria and page. `page` starts at 0. */
export type SearchParams = Readonly<{
    marke?: string | undefined;
    fin?: string | undefined;
    page: number;
    size: number;
}>;

/** One page of search results. */
export type Slice = Readonly<{
    content: readonly AutoDto[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
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

/** Searches vehicles by brand (case-insensitive substring) and FIN (exact), page by page. */
export const find = async ({ marke, fin, page, size }: SearchParams): Promise<Slice> => {
    // RQB aliases the table, so the condition is built from the table that is passed in.
    const buildWhere = (table: typeof autoTable) =>
        and(
            marke === undefined ? undefined : ilike(table.marke, `%${marke}%`),
            fin === undefined ? undefined : eq(table.fin, fin),
        ) ?? sql`true`;

    const [totalElements, rows] = await Promise.all([
        db.$count(autoTable, buildWhere(autoTable)),
        db.query.autoTable.findMany({
            where: { RAW: (table) => buildWhere(table) },
            with: { kennzeichenTable: true, wartungTable: true },
            orderBy: { id: 'asc' },
            limit: size,
            offset: page * size,
        }),
    ]);

    return {
        content: rows.map((row) => toDto(row)),
        page,
        size,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
    };
};
