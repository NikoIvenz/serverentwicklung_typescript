# Auto REST API (TypeScript)

REST API for vehicles (`Auto`) with Hono, Zod, Drizzle and PostgreSQL (TLS), secured by Keycloak.
Each vehicle has a 1:1 license plate (`Kennzeichen`) and 1:N maintenance records (`Wartung`).

## Table of Contents

- [Features](#features)
- [Scope](#scope)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Keycloak Setup](#keycloak-setup)
- [REST Interface](#rest-interface)
- [Database Access with Drizzle](#database-access-with-drizzle)
- [Demo](#demo)
- [Tests and Code Quality](#tests-and-code-quality)

## Features

- Read, create and update vehicles including license plate and maintenance records
- Search by brand (case-insensitive substring) and FIN (exact)
- Optimistic locking via `ETag` / `If-Match` and conditional reads via `If-None-Match`
- Validation with Zod; errors as Problem Details (RFC 9457, `application/problem+json`)
- HTTPS with HTTP/2 (self-signed certificate in `src/config/tls/`)
- `POST` is protected: it requires a Keycloak access token with the client role `admin`
- Generated primary keys, timestamps for INSERT and UPDATE, no lost updates

## Scope

The items that the checklist strikes through are not part of this project: unit tests, the HTTP
method `QUERY`, `DELETE` and pagination. The acceptance is done with integration tests (Vitest and
Axios over HTTP/2).

## Project Structure

```text
src/
├── index.mts, server.mts   # start of the HTTP/2 server with TLS
├── app.mts                 # Hono app, routes, global error handler
├── problem-details.mts     # error responses (RFC 9457)
├── status.mts              # HTTP status codes
├── config/                 # settings, DB client, TLS certificate of the server
├── db/                     # Drizzle schema and relations (generated, then adapted)
├── auto/
│   ├── router/             # REST endpoints and Zod schemas
│   └── service/            # read and write access through Drizzle, domain errors
└── security/               # Keycloak token check (jose) and role middleware
test/integration/           # Vitest and Axios over HTTP/2
scripts/demo.sh             # demo requests with checks (make demo)
keycloak/                   # compose file, realm setup script
postgres-setup/             # compose file, SQL scripts and CSV test data
```

Requests pass through `router` → `service` → Drizzle.

## Prerequisites

- Node 26.13.1 and pnpm 12.21.0. With nvm: `source ~/.nvm/nvm.sh && nvm use` (reads `.nvmrc`).
  Older Node versions cannot run `.mts` files.
- Docker
- Make (optional, `make help` lists all targets)

## Getting Started

1. Set up PostgreSQL once as described in [postgres-setup/README.md](postgres-setup/README.md),
   then start it:

   ```shell
   make db-up
   ```

2. Set up Keycloak once as described in [Keycloak Setup](#keycloak-setup), then start it:

   ```shell
   make kc-up
   ```

3. Create `.env` from the template and install the dependencies. `CLIENT_SECRET` is shown in
   Keycloak under Clients > `javascript-client` > Credentials.

   ```shell
   cp .env.example .env
   make install
   ```

4. Start the server (<https://localhost:3000>, accept the certificate warning of the self-signed
   certificate):

   ```shell
   make run
   ```

   Liveness probe: `GET /health`. Check the database access without the server: `make smoke`
   prints two vehicles with plate and maintenance records.

## Keycloak Setup

Keycloak runs as a container next to PostgreSQL and stores its data in the database `keycloak` of
the same PostgreSQL container (admin console: <http://localhost:8880>). The following steps are only
needed once. PostgreSQL must be running (`make db-up`).

1. Database, user and schema for Keycloak:

   ```shell
   docker compose -f postgres-setup/compose.yml exec -e PGPASSWORD=p postgres psql -U postgres -d postgres \
     -c "CREATE USER keycloak PASSWORD 'p';" -c "CREATE DATABASE keycloak;" \
     -c "GRANT ALL ON DATABASE keycloak TO keycloak;"
   docker compose -f postgres-setup/compose.yml exec -e PGPASSWORD=p postgres psql -U keycloak -d keycloak \
     -c "CREATE SCHEMA IF NOT EXISTS AUTHORIZATION keycloak;" \
     -c "ALTER ROLE keycloak SET search_path = 'keycloak';"
   ```

2. Volumes, and a self-signed certificate for Keycloak. The private key `keycloak/tls/key.pem`
   is not in the repository, so create a new key and certificate pair (this replaces the committed
   `certificate.crt` locally; do not commit it):

   ```shell
   docker volume create kc_data
   docker volume create kc_tls
   openssl req -x509 -newkey rsa:2048 -nodes -keyout keycloak/tls/key.pem -out keycloak/tls/certificate.crt \
     -days 825 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
   docker run --rm -u 0:0 --entrypoint '' -v kc_tls:/opt/keycloak/tls -v "$PWD/keycloak/tls":/tmp/tls:ro \
     dhi.io/keycloak:26.8.2-debian13 bash -c "cp /tmp/tls/certificate.crt /opt/keycloak/tls/kc_cert \
     && cp /tmp/tls/key.pem /opt/keycloak/tls/kc_key && chown -R nonroot:nonroot /opt/keycloak/tls \
     && chmod 400 /opt/keycloak/tls/* && chmod 500 /opt/keycloak/tls"
   ```

3. Start Keycloak and create realm `javascript`, client `javascript-client`, the client roles
   `admin` and `user` and the users `admin` and `user` (password `p` for both):

   ```shell
   make kc-up
   make kc-setup
   ```

   `make kc-setup` logs in with the bootstrap administrator `tmp` / `p` of a fresh Keycloak
   (see `keycloak/compose.yml`). It is meant to run once; a second run prints HTTP 409 for
   everything that exists already.

Check the setup: a token request for `admin` returns a token with the role `admin` under
`resource_access.javascript-client.roles` (see the example in the next section).

## REST Interface

| Method | Path         | Description                                 | Success                        | Access  |
| ------ | ------------ | ------------------------------------------- | ------------------------------ | ------- |
| GET    | `/rest/{id}` | Read a vehicle; honors `If-None-Match`      | 200 with `ETag`, 304           | public  |
| GET    | `/rest`      | Search with `marke` and `fin`               | 200 with a list                | public  |
| POST   | `/rest`      | Create a vehicle with plate and maintenance | 201 with `Location` and `ETag` | `admin` |
| PUT    | `/rest/{id}` | Update master data; requires `If-Match`     | 204 with new `ETag`            | public  |

`PUT` replaces the master data `fin`, `marke`, `modell` and `farbe`; a missing `farbe` is stored as
empty. License plate and maintenance records are not changed.

| Status | Cause                                                                    |
| ------ | ------------------------------------------------------------------------ |
| 400    | The body is not valid JSON                                               |
| 401    | `POST` without a valid access token                                      |
| 403    | `POST` with a token that does not have the role `admin`                  |
| 404    | Vehicle not found, or the id is not a valid vehicle id                   |
| 412    | Outdated version, or `If-Match` is not a version number                  |
| 422    | Invalid payload or query parameter, or the FIN already exists            |
| 428    | `If-Match` header missing on `PUT`                                       |
| 503    | `POST`: the token cannot be checked because Keycloak is not reachable    |

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

`farbe` is optional and one of `SCHWARZ`, `WEISS`, `SILBER`, `ROT`, `BLAU`. The FIN has 17
characters without `I`, `O` and `Q`. Update with the version from the `ETag`:

```shell
curl -k --http2 -X PUT https://localhost:3000/rest/<id> -H "If-Match: \"0\"" \
  -H "Content-Type: application/json" \
  -d '{"fin":"WXYZ1234567890123","marke":"TESLA","modell":"Model Y","farbe":"WEISS"}'
```

## Database Access with Drizzle

The database is created by the SQL scripts in `postgres-setup/init/auto/sql/`, not by Drizzle.
`src/db/schema.mts` and `src/db/relations.mts` were generated with `drizzle-kit pull` and then
adapted (names, timestamps). Never run `drizzle-kit push` or `drizzle-kit migrate`.

The columns `erzeugt` and `aktualisiert` have no default in the database, so the schema sets them
in code. Lost updates are prevented with `UPDATE ... WHERE id = ? AND version = ?`.

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
