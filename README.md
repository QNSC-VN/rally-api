<div align="center">

# Rally API

**The backend for Rally — QNSC's internal Agile work-management platform.**

A modular, event-driven NestJS monorepo serving projects, sprints, backlogs, releases,
and collaboration, with multi-tenant data isolation and first-class observability.

![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-5-000000?style=flat-square&logo=fastify&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-instrumented-425CC7?style=flat-square&logo=opentelemetry&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

</div>

---

## Overview

Rally API is the server-side of the Rally platform, consumed by
[`rally-web`](https://github.com/QNSC-VN/rally-web). It is a **pnpm + NestJS monorepo** with
two deployable apps — an HTTP **API** and a background **worker** — built on a set of shared
libraries and domain modules.

| | |
| :-- | :-- |
| **Framework** | NestJS 11 on Fastify 5 |
| **Language** | TypeScript (strict) |
| **Database** | PostgreSQL 17 + Drizzle ORM (with Row-Level Security for tenant isolation) |
| **Cache / coordination** | Redis / Valkey (ioredis) |
| **Auth** | EdDSA JWT (jose) · Passport · Argon2 password hashing · Microsoft Entra ID (SSO) |
| **Validation** | Zod (`nestjs-zod`, `drizzle-zod`) |
| **Messaging** | AWS SNS + SQS (event-driven, with DLQs and a transactional outbox) |
| **Storage / email** | AWS S3 (presigned uploads) · SES / Resend |
| **Resilience** | Circuit breakers & retries (cockatiel) |
| **Observability** | OpenTelemetry (traces + metrics) · Pino structured logging · Terminus health checks |
| **API docs** | OpenAPI / Swagger (`@nestjs/swagger`) |
| **Testing** | Vitest + Supertest + Testcontainers |
| **Package manager** | pnpm |

---

## Getting Started

### Prerequisites

- **Node.js 24** (see [`.nvmrc`](./.nvmrc) — run `nvm use`); engines require Node ≥ 22, pnpm ≥ 9
- **pnpm** (`corepack enable`)
- **Docker** — for the local Postgres, Valkey, and LocalStack (AWS) stack

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env
#    Generate a JWT key pair (EdDSA):
#    openssl genpkey -algorithm ed25519   → set JWT_PRIVATE_KEY / JWT_PUBLIC_KEY

# 3. Start infrastructure (Postgres + Valkey + LocalStack)
docker compose -f docker-compose.dev.yml up -d

# 4. Run migrations and seed data
pnpm db:migrate
pnpm db:seed

# 5. Start the API (and, in a second terminal, the worker)
pnpm start:dev
pnpm start:dev:worker
```

The API serves on **http://localhost:3000**. Interactive API docs are available at
`/api/docs` (OpenAPI JSON at `/api/docs-json` — this is what `rally-web` consumes for codegen).

> **Local AWS via LocalStack.** `docker-compose.dev.yml` runs a full local AWS (SQS/SNS/S3/Secrets)
> — no real account needed. The init hook auto-creates all queues, topics, DLQs, and the S3
> bucket. Production AWS resources are provisioned in the
> [`rally-infra`](https://github.com/QNSC-VN/rally-infra) repo via Terraform.

---

## Available Scripts

| Script | Description |
| :----- | :---------- |
| `pnpm start:dev` | Run the **API** app in watch mode |
| `pnpm start:dev:worker` | Run the **worker** app in watch mode |
| `pnpm start:debug` | Run the API with the inspector attached |
| `pnpm build` | Build both `api` and `worker` apps |
| `pnpm lint` / `pnpm lint:fix` | Lint `apps`, `libs`, `db` |
| `pnpm format` | Format with Prettier |
| `pnpm test` / `pnpm test:watch` | Run unit tests (Vitest) |
| `pnpm test:cov` | Run tests with coverage |
| `pnpm test:e2e` | Run end-to-end tests (Testcontainers-backed) |
| `pnpm db:generate` | Generate a migration from schema changes (drizzle-kit) |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed the database |
| `pnpm db:studio` | Open Drizzle Studio (DB browser) |

---

## Architecture

A NestJS **monorepo** with two deployable applications sharing a library layer:

```
apps/
├── api/        # HTTP application (Fastify) — request handling, auth, REST endpoints
└── worker/     # Background application — SQS consumers, cron jobs, outbox dispatch, email

libs/
├── modules/    # Domain modules (DDD-oriented), one bounded context each:
│               #   access · audit · collaboration · identity · notifications · planning
│               #   projects · releases · reporting · tenancy · work-items · workflow
├── contracts/  # Shared API/event contracts and DTOs
├── platform/   # Cross-cutting infrastructure (db, messaging, storage, config, …)
└── shared-kernel/  # Shared domain primitives used across modules
```

### Event-driven flow

Domain changes are persisted with a **transactional outbox**, published to **SNS**, and
fan-out to **SQS** queues consumed by the **worker** (notifications, audit, reporting). This
decouples write paths from side effects and gives at-least-once delivery with DLQs for
poison messages.

### Multi-tenancy & security

- **Row-Level Security (RLS)** enforces tenant isolation at the database layer. A separate,
  privileged `DATABASE_MIGRATION_URL` is used for migrations so they can bypass RLS.
- **EdDSA JWT** access/refresh tokens (jose), **Argon2** password hashing, **CSRF protection**,
  and **Helmet** security headers (all via Fastify plugins).
- **Microsoft Entra ID (SSO)** — when configured, the API validates Entra tokens via JWKS and
  provisions users just-in-time. Optional; leave the `ENTRA_*` vars empty to disable.

### Database

Drizzle ORM with schema in [`db/schema/`](./db/schema), migrations in `db/migrations/`, and
seeds in `db/seeds/`. Generate migrations from schema changes with `pnpm db:generate`.

---

## Configuration

All configuration is via environment variables — see [`.env.example`](./.env.example) for the
full, documented list. Key groups:

| Group | Examples |
| :---- | :------- |
| **App** | `NODE_ENV`, `PORT`, `HOST`, `CORS_ORIGINS` |
| **Database** | `DATABASE_URL`, `DATABASE_MIGRATION_URL`, pool sizing |
| **Redis** | `REDIS_URL`, `REDIS_KEY_PREFIX` |
| **Auth** | `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY` (EdDSA), expiries, `CSRF_SECRET` |
| **AWS** | region, SNS topic, SQS queue URLs, S3 bucket (LocalStack defaults in dev) |
| **Observability** | `OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `LOG_LEVEL` |
| **SSO** | `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` (optional) |

> ⚠️ Never commit real secrets. In production, secrets are sourced from AWS Secrets Manager.

---

## Testing

- **Unit** — Vitest (`pnpm test`).
- **End-to-end** — Vitest + Supertest against **Testcontainers** (real Postgres/dependencies
  spun up per run) via `pnpm test:e2e`.

```bash
pnpm test        # unit
pnpm test:cov    # with coverage
pnpm test:e2e    # end-to-end (requires Docker)
```

---

## Code Quality & Workflow

- **ESLint** + **Prettier** across `apps`, `libs`, `db`.
- **Husky + lint-staged** — pre-commit lint + format (`--max-warnings=0`).
- **commitlint** — [Conventional Commits](https://www.conventionalcommits.org/) required.
- **release-please** — automated versioning and changelog.

Open a Pull Request into the default branch; CI (lint, tests, security) and at least one
review are required before merge. See the
[organization contribution guidelines and templates](https://github.com/QNSC-VN/.github).

---

## Security

Found a vulnerability? **Do not open a public issue.** Follow [`SECURITY.md`](./SECURITY.md).

---

## License

Proprietary and confidential. © QNSC — Quy Nhon Semiconductor. See [`LICENSE`](./LICENSE).
