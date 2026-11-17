# CSCL SMM Hub

Internal Corporate B2B SaaS Dashboard for multi-platform esports content scheduling, validation, and analytics.

CSCL SMM Hub centralizes drafting, validation, scheduling, publishing, historical backfill, and performance tracking across Discord, Telegram, X/Twitter, FACEIT, and the CSCL Website.

## Key Engineering Highlights

- **Dynamic “+” target cards:** Build multi-platform delivery plans with `react-hook-form` and `useFieldArray`, including per-target channels, overrides, and metadata.
- **Fault-Tolerant Scheduler:** Protect jobs with an atomic `PROCESSING` lock, recover stale locks after five minutes, and isolate concurrent platform dispatch with `Promise.allSettled()` and 10-second timeouts.
- **Dual-Mode Post Editing:** Use `NATIVE_EDIT` for Discord, Telegram, and the CSCL Website; opt into `REPLACE_ON_EDIT` for X/Twitter and FACEIT.
- **Time-Window Clustered Backfill & Idempotent Sync:** Import historical posts, synchronize external records, and prevent duplicates with platform/external ID constraints.
- **Database-Driven Few-Shot AI Assistant:** Generate drafts from operator-provided bullet points using category-matched exemplar posts stored in PostgreSQL, with mandatory human review.

## Approved Tech Stack (Zero-Bloat)

- Next.js 16 (App Router)
- TypeScript 5+ (`strict`, `noUncheckedIndexedAccess`)
- PostgreSQL 17
- Prisma 7
- Cloudflare R2 (`@aws-sdk/client-s3`)
- Better Auth (server-side whitelist)
- Zod
- Tailwind CSS + shadcn/ui

## Architecture & Technical Specification

See the [Architecture & Technical Specification](./docs/ARCHITECTURE.md).

## Local Development Quickstart

```bash
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npm run dev
```

## License

Proprietary / Source-Available (UNLICENSED — All Rights Reserved). See `./LICENSE` for details.
