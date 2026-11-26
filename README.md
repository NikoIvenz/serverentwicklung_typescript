# Auto REST API (TypeScript)

REST API for vehicles (`Auto`) with Hono, Zod, Drizzle and PostgreSQL (TLS), secured by Keycloak.
Each vehicle has a 1:1 license plate (`Kennzeichen`) and 1:N maintenance records (`Wartung`).

## Features

- Read, create and update vehicles including license plate and maintenance records
- Search by brand (case-insensitive substring) and FIN (exact)
- Optimistic locking via `ETag` / `If-Match` and conditional reads via `If-None-Match`
- Validation with Zod; errors as Problem Details (RFC 9457, `application/problem+json`)
- HTTPS with HTTP/2 (self-signed certificate in `src/config/tls/`)
- `POST` is protected: it requires a Keycloak access token with the client role `admin`

## Prerequisites

- Node 26.13.1 and pnpm 12.21.0. With nvm: `source ~/.nvm/nvm.sh && nvm use` (reads `.nvmrc`).
   Older Node versions cannot run `.mts` files.
- Docker
- Make (optional)

## Getting Started

1. Set up PostgreSQL once as described in [postgres-setup/README.md](postgres-setup/README.md),
   then start it:

   ```shell
   make db-up
   ```

2. Prepare Keycloak once (see below), start it and create
   realm `javascript`, client `javascript-client`, client roles `admin` and `user` and the users
   `admin` and `user` (password `p`):

   ```shell
   make kc-up
   make kc-setup
   ```

   One-time preparation (before `make kc-up`): copy `keycloak/tls/*` into the volume `kc_tls` as `kc_cert` and `kc_key`,
   create the volumes `kc_data` and `kc_tls` and the database user `keycloak` with database and
   schema `keycloak` (same steps as for `auto` in `postgres-setup/`).

   Admin console: <http://localhost:8880>. Keycloak stores its data in the database `keycloak`
   of the same PostgreSQL container.

3. Create `.env` from the template and install the dependencies. `CLIENT_SECRET` is shown in
   Keycloak under Clients > `javascript-client` > Credentials.

   ```shell
   cp .env.example .env
   make install
   ```

4. Start the server and open <https://localhost:3000/rest/1> (accept the certificate warning):

   ```shell
   make run
   ```

   Check the database access without the server: `make smoke` prints two vehicles with plate and
   maintenance records.

## REST Interface

| Method | Path          | Description                                  | Success                         | Access |
| ------ | ------------- | -------------------------------------------- | ------------------------------- | ------ |
| GET    | `/rest/{id}`  | Read a vehicle; honors `If-None-Match`       | 200 with `ETag`, 304            | public |
| GET    | `/rest`       | Search with `marke` and `fin`                | 200 with a list                 | public |
| POST   | `/rest`       | Create a vehicle with plate and maintenance  | 201 with `Location` and `ETag`  | `admin` |
| PUT    | `/rest/{id}`  | Update master data; requires `If-Match`      | 204 with new `ETag`             | public |

| Status | Cause                                                          |
| ------ | -------------------------------------------------------------- |
| 400    | The body is not valid JSON                                     |
| 401    | `POST` without a valid access token                            |
| 403    | `POST` with a token that does not have the role `admin`        |
| 404    | Vehicle not found                                              |
| 412    | Outdated version, or `If-Match` is not a version number        |
| 422    | Invalid payload or query parameter, or the FIN already exists  |
| 428    | `If-Match` header missing on `PUT`                             |

Get a token and create a vehicle (`CLIENT_SECRET` is in `.env`):

```shell
TOKEN=$(curl -s -d grant_type=password -d client_id=javascript-client \
  -d client_secret=$CLIENT_SECRET -d username=admin -d password=p \
  http://localhost:8880/realms/javascript/protocol/openid-connect/token | sed 's/.*"access_token":"\([^"]*\)".*/\1/')

curl -k --http2 -X POST https://localhost:3000/rest \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"fin":"WXYZ1234567890123","marke":"TESLA","modell":"Model 3","farbe":"WEISS",
       "kennzeichen":{"kombination":"KA-TS 123","ausstellungsdatum":"2026-02-01"},
       "wartungen":[{"beschreibung":"Inspektion","kosten":"99.90"}]}'
```

`farbe` is one of `SCHWARZ`, `WEISS`, `SILBER`, `ROT`, `BLAU`. The FIN has 17 characters without
`I`, `O` and `Q`.

## Database Access with Drizzle

The database is created by the SQL scripts in `postgres-setup/init/auto/sql/`, not by Drizzle.
`src/db/schema.mts` and `src/db/relations.mts` were generated with `drizzle-kit pull` and then
adapted (names, timestamps). Never run `drizzle-kit push` or `drizzle-kit migrate`.

`make studio` opens Drizzle Studio (select the schema `auto`) to browse the 1:1 and 1:N relations.

## Demo

With the server running (`make run`), `make demo` sends the requests one after the other, prints
each one and checks the result: GET with `ETag` and `If-None-Match`, POST with and without the role
`admin`, PUT with `If-Match` (428, 204, 412). It waits before it removes the vehicle it created, so
the new row can be shown in Drizzle Studio (`make studio`) first.

## Tests and Code Quality

The integration tests (Vitest and Axios over HTTP/2) start their own server on port 3001, so they
need PostgreSQL, Keycloak and `CLIENT_SECRET` in `.env`. Every test creates its own vehicle with a
unique FIN and removes it from the DB afterwards.

```shell
make test        # integration tests
make check       # oxlint, oxfmt --check, tsc
make lint
make format
```
