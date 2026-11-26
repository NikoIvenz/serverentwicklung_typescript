/** HTTP status codes used by the application. */
export const STATUS = {
    ok: 200,
    created: 201,
    noContent: 204,
    notModified: 304,
    badRequest: 400,
    unauthorized: 401,
    forbidden: 403,
    notFound: 404,
    preconditionFailed: 412,
    unprocessable: 422,
    preconditionRequired: 428,
    internalServerError: 500,
} as const;
