.PHONY: help install run test db-up db-down kc-up kc-down smoke studio lint format fmt-check typecheck check

PG := docker compose -f postgres-setup/compose.yml
KC := docker compose -f keycloak/compose.yml

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F ':.*## ' '{printf "  %-10s %s\n", $$1, $$2}'

install: ## Install all dependencies
	pnpm install

run: ## Start the server (https://localhost:3000)
	pnpm start

test: ## Run the integration tests (needs PostgreSQL and Keycloak)
	pnpm test

db-up: ## Start the PostgreSQL container
	$(PG) up -d

db-down: ## Stop the PostgreSQL container
	$(PG) down

kc-up: ## Start Keycloak (PostgreSQL must already run)
	$(KC) up -d --no-deps keycloak

kc-setup: ## Create realm, client, roles and users in Keycloak (once)
	node keycloak/setup-realm.mjs

kc-down: ## Stop Keycloak
	$(KC) stop keycloak

smoke: ## Read vehicles with relations through Drizzle
	pnpm smoke

studio: ## Open Drizzle Studio as DB browser
	pnpm db:studio

lint: ## Run oxlint
	pnpm lint

format: ## Format the code with oxfmt
	pnpm fmt

fmt-check: ## Check the formatting
	pnpm fmt:check

typecheck: ## Run the TypeScript compiler
	pnpm tsc

check: lint fmt-check typecheck ## Run lint, format check and type check
