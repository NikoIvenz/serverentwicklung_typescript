// oxlint-disable max-classes-per-file -- small related error types belong together

/** No valid access token was sent. */
export class UnauthorizedError extends Error {
    override name = 'UnauthorizedError';
}

/** The token does not contain the required role. */
export class ForbiddenError extends Error {
    override name = 'ForbiddenError';
}

/** The token cannot be checked because Keycloak is not reachable. */
export class AuthServiceUnavailableError extends Error {
    override name = 'AuthServiceUnavailableError';
}
