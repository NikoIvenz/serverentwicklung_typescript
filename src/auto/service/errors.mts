// oxlint-disable max-classes-per-file -- small related error types belong together

/** The vehicle does not exist. */
export class NotFoundError extends Error {
    override name = 'NotFoundError';
}

/** The version in `If-Match` is outdated or malformed. */
export class VersionOutdatedError extends Error {
    override name = 'VersionOutdatedError';
}

/** Another vehicle already has this FIN. */
export class FinExistsError extends Error {
    override name = 'FinExistsError';
}
