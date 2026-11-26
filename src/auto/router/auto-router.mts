import { find, findById } from '../service/auto-service.mts';
import { Hono } from 'hono';
import { STATUS } from '../../status.mts';
import { problemDetails } from '../../problem-details.mts';
import { z } from 'zod';

const DECIMAL = 10;
const DEFAULT_SIZE = 5;
const MAX_SIZE = 100;

const searchSchema = z.object({
    marke: z.string().optional(),
    fin: z.string().optional(),
    page: z.coerce.number().int().min(0).default(0),
    size: z.coerce.number().int().min(1).max(MAX_SIZE).default(DEFAULT_SIZE),
});

// The version is the ETag; weak validators (W/"1") and quotes are tolerated.
const stripEtag = (value: string) => value.trim().replace(/^W\//u, '').replaceAll('"', '');

/** REST endpoints for vehicles. */
export const autoRouter = new Hono();

autoRouter.get('/:id', async (ctx) => {
    const id = Number.parseInt(ctx.req.param('id'), DECIMAL);
    if (Number.isNaN(id)) {
        return problemDetails(ctx, STATUS.notFound);
    }

    const auto = await findById(id);
    if (auto === undefined) {
        return problemDetails(ctx, STATUS.notFound, `No vehicle with id ${id}`);
    }

    const { version, ...body } = auto;
    const etag = `"${version}"`;
    const ifNoneMatch = ctx.req.header('If-None-Match');
    if (ifNoneMatch?.split(',').some((tag) => stripEtag(tag) === `${version}`) === true) {
        return ctx.body(null, STATUS.notModified, { ETag: etag });
    }
    return ctx.json(body, STATUS.ok, { ETag: etag });
});

autoRouter.get('/', async (ctx) => {
    const parsed = searchSchema.safeParse(ctx.req.query());
    if (!parsed.success) {
        return problemDetails(ctx, STATUS.unprocessable, z.prettifyError(parsed.error));
    }
    return ctx.json(await find(parsed.data));
});
