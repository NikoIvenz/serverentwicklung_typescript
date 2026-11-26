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
    console.error(cause);
    return problemDetails(ctx, STATUS.internalServerError);
});
