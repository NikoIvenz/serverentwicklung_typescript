import { z } from 'zod';

const MAX_LENGTH = 64;

const text = z.string().trim().min(1).max(MAX_LENGTH);

const autoFields = {
    // 17 characters without I, O and Q
    fin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/u),
    marke: text,
    modell: text,
    farbe: z.enum(['SCHWARZ', 'WEISS', 'SILBER', 'ROT', 'BLAU']).optional(),
};

/** Request body of POST: vehicle with license plate and maintenance records. */
export const autoSchema = z.object({
    ...autoFields,
    kennzeichen: z.object({
        kombination: z.string().regex(/^[A-ZÄÖÜ]{1,3}-[A-Z]{1,2} [1-9][0-9]{0,3}[EH]?$/u),
        ausstellungsdatum: z.iso.date(),
    }),
    wartungen: z
        .array(
            z.object({
                beschreibung: text,
                // NUMERIC(10,2) as string, like the DB returns it
                kosten: z.string().regex(/^\d{1,8}(?:\.\d{1,2})?$/u),
            }),
        )
        .default([]),
});

/** Request body of PUT: master data only. */
export const autoUpdateSchema = z.object(autoFields);

export type AutoInput = z.infer<typeof autoSchema>;
export type AutoUpdateInput = z.infer<typeof autoUpdateSchema>;
