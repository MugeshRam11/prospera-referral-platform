# Isolated Development Database Setup & Operational Guide

## 1. Overview
The Prospera Referral Platform uses **PostgreSQL** with **Prisma ORM**.
This document outlines the procedure for configuring, running, migrating, and testing against an isolated local development PostgreSQL database.

> [!IMPORTANT]
> **Production Safety Policy:**
> - NEVER connect development tooling or integration tests to production databases, production Odoo, or live client systems.
> - NEVER store credentials or secrets in source-controlled files.
> - NEVER use `prisma db push` on staging, production, or formal migration environments. All schema evolution must proceed through versioned Prisma migrations in `prisma/migrations`.

---

## 2. Prerequisites
Choose one of the two local setup options:

### Option A: Docker Compose (Recommended)
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine.
- Ensure Docker daemon is running.

### Option B: Native PostgreSQL Service
- Install PostgreSQL 16 on the host system.
- Create an isolated development database:
  ```sql
  CREATE DATABASE prospera_referral_db;
  ```
- Ensure port `5432` is reachable locally.

---

## 3. Starting the Isolated Database (Docker)

To start the isolated development database container in the background:
```bash
docker compose up -d
```

To verify the container health and status:
```bash
docker compose ps
```

The service exposes port `5432` with credentials:
- **Host:** `localhost`
- **Port:** `5432`
- **User:** `postgres`
- **Password:** `postgres`
- **Database:** `prospera_referral_db`

---

## 4. Applying Versioned Migrations

The platform maintains formal, version-controlled SQL migrations located in `prisma/migrations/`.

1. Ensure the local database container is running.
2. Apply migrations to the database:
   ```bash
   npm run migrate:deploy
   # Or directly:
   npx prisma migrate deploy
   ```
3. Verify the applied migration status:
   ```bash
   npm run migrate:status
   # Or directly:
   npx prisma migrate status
   ```

> [!WARNING]
> Do NOT use `prisma db push` as a shortcut. `prisma db push` circumvents the migration tracking engine, does not record migration files, and hides schema drift.

---

## 5. Running Integration Tests

The test suite is structured into two tiers:
- **Unit Tests:** Run in-memory using mocked/in-memory repositories without external dependencies. Fast, deterministic, and runnable in any environment.
  ```bash
  npm run test:unit
  ```
- **PostgreSQL Integration Tests:** Execute against the live local PostgreSQL instance, verifying real Prisma transactions, foreign keys, database uniqueness constraints, and concurrency safety.
  ```bash
  npm run test:integration
  ```
- **Full Test Suite:** Runs both unit and integration tests:
  ```bash
  npm test
  ```

---

## 6. Teardown and Resetting Local Database

To stop the Docker container without losing data:
```bash
docker compose down
```

To completely reset the database and clear all volumes (e.g. for a clean-slate rebuild):
```bash
docker compose down -v
docker compose up -d
npx prisma migrate deploy
```
