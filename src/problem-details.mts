import { type ContentfulStatusCode } from 'hono/utils/http-status';
import { type Context } from 'hono';
import { STATUS_CODES } from 'node:http';

/**
 * Creates an error response as Problem Details (RFC 9457).
 * @param ctx Hono context of the request
 * @param status HTTP status code
 * @param detail Explanation specific to this occurrence of the problem
 */
export const problemDetails = (ctx: Context, status: ContentfulStatusCode, detail?: string) =>
    ctx.json(
        {
            type: 'about:blank',
            title: STATUS_CODES[status] ?? 'Error',
            status,
            ...(detail === undefined ? {} : { detail }),
            instance: ctx.req.path,
        },
        status,
        { 'Content-Type': 'application/problem+json' },
    );
