import { ForbiddenError, UnauthorizedError } from './errors.mts';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { type MiddlewareHandler } from 'hono';
import { config } from '../config/config.mts';

/** Roles of the Keycloak client. */
export type Role = 'admin' | 'user';

const { url, realm, clientId } = config.keycloak;
const issuer = `${url}/realms/${realm}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`));
const BEARER = 'Bearer ';

type ResourceAccess = Record<string, { roles?: readonly string[] }>;

/**
 * Middleware that accepts only requests with a Keycloak access token that has one of the roles.
 * @param roles Allowed client roles
 */
export const rolesRequired =
    (...roles: readonly Role[]): MiddlewareHandler =>
    async (ctx, next) => {
        const authorization = ctx.req.header('Authorization');
        if (authorization?.startsWith(BEARER) !== true) {
            throw new UnauthorizedError('Bearer token is missing');
        }

        const token = authorization.slice(BEARER.length);
        const { payload } = await jwtVerify(token, jwks, {
            issuer,
            algorithms: ['RS256'],
        }).catch((error: unknown) => {
            throw new UnauthorizedError('Token is invalid or expired', { cause: error });
        });

        // Client roles: { "resource_access": { "javascript-client": { "roles": ["admin"] } } }
        const clientRoles = (payload['resource_access'] as ResourceAccess | undefined)?.[clientId]
            ?.roles;
        if (!roles.some((role) => clientRoles?.includes(role) === true)) {
            throw new ForbiddenError(`Role ${roles.join(' or ')} is required`);
        }
        return next();
    };
