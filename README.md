# CSCL SMM Hub

Internal Corporate B2B SaaS Dashboard for multi-platform esports content scheduling, validation, and analytics.

CSCL SMM Hub centralizes drafting, validation, scheduling, publishing, historical backfill, and performance tracking across Discord, Telegram, X/Twitter, FACEIT, and the CSCL Website.

## Key Engineering Highlights

- **Dynamic "+" Target Cards & Registry-Driven UI:** Build multi-platform delivery plans with `react-hook-form` (`useFieldArray`), Smart Defaults, deterministic N-to-1 Discord channel mapping (including archived sponsor channels), and 3-layer duplicate protection (UI Poka-Yoke, Zod v4 `.superRefine()`, PostgreSQL `@@unique`).
- **Direct-to-R2 Media Pipeline:** Generate short-lived S3 Presigned URLs (`@aws-sdk/s3-request-presigner`) with server-generated UUID keys and strict MIME whitelisting for direct browser uploads to Cloudflare R2 ($0 egress, zero server `Buffer` proxying).
- **Fault-Tolerant Scheduler (Zero-Bloat):** PostgreSQL-backed queue triggered via system `crontab` (no Redis/BullMQ overhead) with atomic `PROCESSING` locks, 5-minute stale lock recovery, `Promise.allSettled()` failure isolation, and 10-second `AbortSignal` timeouts.
- **Dual-Mode Post Editing:** In-place `NATIVE_EDIT` for Discord, Telegram, and the CSCL Website; opt-in `REPLACE_ON_EDIT` for X/Twitter and FACEIT.
- **Time-Window Clustered Backfill & Idempotent Sync:** Reconstruct and sync historical posts from external platforms without duplicates using `(platform, externalId)` unique constraints.
- **Database-Driven Few-Shot AI Assistant:** Generate drafts from tournament bullet points using category-matched exemplar posts (`isExemplar`) queried from PostgreSQL, with mandatory human review.

## Approved Tech Stack (Zero-Bloat)

- **Framework & Language:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5+ (`strict`, `noUncheckedIndexedAccess`)
- **Database & ORM:** PostgreSQL 17, Prisma 7 (`prisma-client`, `@prisma/adapter-pg`, `pg`)
- **Object Storage:** Cloudflare R2 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **Forms & Validation:** Zod v4, `react-hook-form` (`@hookform/resolvers`)
- **Styling & UI:** Tailwind CSS v4 (CSCL brand tokens via `@theme inline`, dark-only App Shell), `Inter` + `Geist Mono` (`next/font/google`), `shadcn/ui`, `react-markdown`
- **Authentication:** Better Auth (Discord OAuth, Steam OpenID, Email + server-side `ALLOWED_USERS_WHITELIST`)
- **Infrastructure:** Docker & Docker Compose, system `crontab`, GitHub Actions CI/CD

## Architecture & Technical Specification

See the [Architecture & Technical Specification](./docs/ARCHITECTURE.md).

## Local Development Quickstart

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate dev
npx prisma generate
npm run dev
```

## License

Proprietary / Source-Available (`UNLICENSED` — All Rights Reserved). See `./LICENSE` for details.
