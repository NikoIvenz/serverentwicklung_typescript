import { FinExistsError, NotFoundError, VersionOutdatedError } from './auto/service/errors.mts';
import { ForbiddenError, UnauthorizedError } from './security/errors.mts';
import { Hono } from 'hono';
import { STATUS } from './status.mts';
import { autoRouter } from './auto/router/auto-router.mts';
import { problemDetails } from './problem-details.mts';

/** Hono application with all routes. */
export const app = new Hono();

app.get('/health', (ctx) => ctx.json({ status: 'up' }));
app.route('/rest', autoRouter);

app.notFound((ctx) => problemDetails(ctx, STATUS.notFound));
app.onError((cause, ctx) => {
    if (cause instanceof NotFoundError) {
        return problemDetails(ctx, STATUS.notFound, cause.message);
    }
    if (cause instanceof VersionOutdatedError) {
        return problemDetails(ctx, STATUS.preconditionFailed, cause.message);
    }
    if (cause instanceof FinExistsError) {
        return problemDetails(ctx, STATUS.unprocessable, cause.message);
    }
    if (cause instanceof UnauthorizedError) {
        return problemDetails(ctx, STATUS.unauthorized, cause.message);
    }
    if (cause instanceof ForbiddenError) {
        return problemDetails(ctx, STATUS.forbidden, cause.message);
    }
    console.error(cause);
    return problemDetails(ctx, STATUS.internalServerError);
});
