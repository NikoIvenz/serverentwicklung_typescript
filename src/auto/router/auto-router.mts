import { autoSchema, autoUpdateSchema } from './auto-schema.mts';
import { create, deleteById, update } from '../service/auto-write-service.mts';
import { find, findById } from '../service/auto-service.mts';
import { Hono } from 'hono';
import { STATUS } from '../../status.mts';
import { VersionOutdatedError } from '../service/errors.mts';
import { problemDetails } from '../../problem-details.mts';
import { rolesRequired } from '../../security/roles-required.mts';
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

// A malformed JSON body is a client error (400), not a validation error (422).
const readJson = async (req: { json: () => Promise<unknown> }) => {
    try {
        return { body: await req.json() };
    } catch {
        return undefined;
    }
};

// Only administrators may create vehicles.
autoRouter.post('/', rolesRequired('admin'), async (ctx) => {
    const json = await readJson(ctx.req);
    if (json === undefined) {
        return problemDetails(ctx, STATUS.badRequest, 'The request body is not valid JSON');
    }
    const parsed = autoSchema.safeParse(json.body);
    if (!parsed.success) {
        return problemDetails(ctx, STATUS.unprocessable, z.prettifyError(parsed.error));
    }

    const { id, version } = await create(parsed.data);
    const location = `${new URL(ctx.req.url).origin}/rest/${id}`;
    return ctx.body(null, STATUS.created, { Location: location, ETag: `"${version}"` });
});

autoRouter.put('/:id', async (ctx) => {
    const id = Number.parseInt(ctx.req.param('id'), DECIMAL);
    if (Number.isNaN(id)) {
        return problemDetails(ctx, STATUS.notFound);
    }

    const ifMatch = ctx.req.header('If-Match');
    if (ifMatch === undefined) {
        return problemDetails(ctx, STATUS.preconditionRequired, 'Header If-Match is required');
    }
    const version = stripEtag(ifMatch);
    if (!/^\d+$/u.test(version)) {
        throw new VersionOutdatedError(`If-Match ${ifMatch} is not a version number`);
    }

    const json = await readJson(ctx.req);
    if (json === undefined) {
        return problemDetails(ctx, STATUS.badRequest, 'The request body is not valid JSON');
    }
    const parsed = autoUpdateSchema.safeParse(json.body);
    if (!parsed.success) {
        return problemDetails(ctx, STATUS.unprocessable, z.prettifyError(parsed.error));
    }

    const newVersion = await update(id, Number.parseInt(version, DECIMAL), parsed.data);
    return ctx.body(null, STATUS.noContent, { ETag: `"${newVersion}"` });
});

autoRouter.delete('/:id', async (ctx) => {
    const id = Number.parseInt(ctx.req.param('id'), DECIMAL);
    if (!Number.isNaN(id)) {
        await deleteById(id);
    }
    return ctx.body(null, STATUS.noContent);
});
