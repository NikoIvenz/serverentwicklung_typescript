# Auto REST API (TypeScript)

REST API for vehicles (`Auto`) with Hono, Zod, Drizzle and PostgreSQL (TLS), secured by Keycloak.
Each vehicle has a 1:1 license plate (`Kennzeichen`) and 1:N maintenance records (`Wartung`).

> **Status:** the preparation is finished (database, Keycloak, tooling, generated Drizzle code).
> The REST interface with Hono is the next step.

## Prerequisites

- Node 26.13.1 and pnpm 12.21.0
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

4. Check that the database access works: two vehicles with plate and maintenance records are printed.

   ```shell
   make smoke
   ```

## Database Access with Drizzle

The database is created by the SQL scripts in `postgres-setup/init/auto/sql/`, not by Drizzle.
`src/db/schema.mts` and `src/db/relations.mts` were generated with `drizzle-kit pull` and then
adapted (names, timestamps). Never run `drizzle-kit push` or `drizzle-kit migrate`.

`make studio` opens Drizzle Studio (select the schema `auto`) to browse the 1:1 and 1:N relations.

## Code Quality

```shell
make check       # oxlint, oxfmt --check, tsc
make lint
make format
```
