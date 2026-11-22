# CSCL SMM Hub — Technical Specification & Architecture (SRS & SAD / Design Doc)

- **Document Status:** Approved for Development (v2.2 — Evolutionary Schema & 1-to-1 Category Mapping)
- **Repository:** `cscl-smm-hub`
- **System Type:** Internal Corporate Web Dashboard (Internal Tool / B2B SaaS Architecture) hosted on a dedicated subdomain within the CSCL ecosystem.
- **Repository Mode & License:** Public Source-Available (`UNLICENSED` / All Rights Reserved — public code visibility for engineering portfolio review with legal prohibition of commercial copying and strict Zero Secrets in Code isolation).

---

## 1. Purpose & Business Goals

**CSCL SMM Hub** is a centralized pipeline for drafting, validating, scheduling, archiving history, and automatically publishing content across the CSCL esports ecosystem.

### Key Business Objectives

- **Batch Scheduling:** Enable the content manager to prepare a batch of posts for a full day or week in a single session and assign them to specific time slots in an interactive calendar.
- **Flexible Multi-Posting via Dynamic Target Cards ("+"):** Publish across 5 target channels (**Discord**, **Telegram**, **X / Twitter**, **FACEIT**, and the **CSCL Website**) with the ability to add multiple target cards via a `"+"` button (for example, targeting multiple Discord channels with distinct text and role pings in a single post) or exclude any platform with one click.
- **Categorization & Exemplar Knowledge Base:** Use the three deterministic categories (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`) mapped 1-to-1 to Discord channels, backfill historical posts from the fixed archive epoch date (`ARCHIVE_EPOCH_DATE`), and reuse top-performing posts (`isExemplar`) as templates and AI few-shot examples.
- **Human-Error Prevention:** Automated enforcement of character limits, media file size/format rules, and Markdown rules per target card, paired with an interactive **Live Preview** prior to publishing.
- **Fault Tolerance & Granular Retry:** External API failure isolation, strict 10-second timeouts, automated retries for transient network errors, stale lock recovery, and one-click retries for failed targets only.
- **History-Driven AI Assistant (Stage 5):** Automated draft generation from tournament/match bullet points using real category exemplars queried directly from PostgreSQL (**Few-Shot Prompting**), governed by mandatory human review (**Human-in-the-Loop**).
- **Sponsor Analytics & Unified Comment Inbox (Stage 6):** Zero-cost collection of reach and engagement metrics across platforms paired with the main CSCL website link tracker for one-click sponsor reports, plus a Unified Comment Inbox on the main dashboard.

---

## 2. Page Map & Application Routing

The UI architecture is divided into dedicated operational screens with zero functional overlap:

- **`/login` (Authentication):** Invite-only login screen supporting Discord OAuth, Steam OpenID, and Email (enforced via a strict server-side Whitelist).
- **`/` (Dashboard — Operational Summary):** Primary control center displaying `FAILED` and `PARTIAL` posts requiring immediate Retry, the upcoming 24-hour publication queue, weekly publishing metrics, and the **Unified Comment Inbox** (unanswered questions from Telegram discussion groups, Discord threads, and the CSCL website with inline reply support, plus direct thread links for X and FACEIT) with 30-second auto-refresh polling.
- **`/calendar` (Interactive Schedule Grid):** Day and week calendar view with category color-coding (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`) and tournament timezone locking for batch scheduling.
- **`/posts` (Post Archive & Registry):** Complete searchable table of all posts (including backfilled historical records) using the **Compact Row List + Slide-over Sheet** UI pattern (60px compact rows with status filter tabs, one-click `"+7 days"` post cloning, manual Delta Sync button for external posts, and a slide-over preview sheet).
- **`/analytics` (Sponsor Analytics & Reports):** Aggregated metrics dashboard (views, likes, reactions + exact click counts synced from the main CSCL website tracker) filterable by post category and tournament dates for exporting sponsor reports.
- **`/posts/new` (Multi-Posting Constructor):** Primary workspace for creating posts:
  - Category selector and `"Pre-fill from category exemplar"` action.
  - Master Markdown editor, dynamic Discord timestamp generator, and Drag-and-Drop banner uploader connected directly to Cloudflare R2 (S3).
  - Dynamic target cards list (`"+"` button powered by `useFieldArray`): select platform, target channel (`channelKey`), optional `customText` override, and platform metadata (Discord role pings, link preview toggles).
  - Tabbed **Live Preview** panel powered by `useWatch` and reactive character counters per card.
- **`/posts/[id]` (Post Inspector, Logs & Editor):** Full edit form for `DRAFT` and `SCHEDULED` posts; granular delivery status monitor, raw JSONB API response viewer, and per-target Retry actions for `FAILED` targets. For already published posts (`PUBLISHED`), supports dual-mode editing via saved `externalId`: in-place native editing (`NATIVE_EDIT` enabled by default for Discord, Telegram, and CSCL Website) and opt-in delete-and-repost replacement (`REPLACE_ON_EDIT` via an unchecked-by-default `"Recreate post"` checkbox for X/Twitter and FACEIT to protect the free X API write quota and existing tweet view counts).
- **`/settings` (Integrations & Channel Routing):** Management interface for the Discord channel registry (mapping `channelKey` to Webhook or Channel ID), API token health checks, and global season snippets (active promo code `cscl`, hub and tournament URLs).

---

## 3. Target Platforms & Constraints Matrix (Platform Registry)

| Platform         | Identifier | Character Limit                                     | Markdown Support                           | Max Media Files | Integration Method                             |
| :--------------- | :--------- | :-------------------------------------------------- | :----------------------------------------- | :-------------- | :--------------------------------------------- |
| **Discord**      | `DISCORD`  | 2000                                                | Yes (Discord MD + role pings & timestamps) | 10              | Discord Webhook / Bot REST API (multi-channel) |
| **Telegram**     | `TELEGRAM` | 4096 (1024 with media)                              | Yes (MarkdownV2 / HTML)                    | 10 (MediaGroup) | Telegram Bot HTTP API                          |
| **X (Twitter)**  | `TWITTER`  | 280                                                 | No (Plain text)                            | 4               | X API v2 (OAuth 2.0, free tier write quota)    |
| **FACEIT**       | `FACEIT`   | 340 (max 3 lines to prevent "Read more" truncation) | Yes                                        | 1               | FACEIT Organizer / Hub API                     |
| **CSCL Website** | `SITE`     | 2000                                                | Yes (Full MD)                              | 10              | Internal Protected REST / Webhook              |

---

## 4. Approved Technology Stack (2026)

Engineered around the **Zero-Bloat Production Stack** principle — enterprise reliability without unnecessary infrastructure overhead:

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions).
- **Language:** TypeScript 5+ (`strict: true`, `noUncheckedIndexedAccess: true`, zero `any` policy).
- **Database & ORM:** PostgreSQL 17 + Prisma 7 using `provider = "prisma-client"` with `@prisma/adapter-pg` and `pg`; the root `prisma.config.ts` owns the database configuration (ACID transactions, composite indexes, and JSONB storage for API payloads and platform metadata).
- **Object Media Storage:** Cloudflare R2 + `@aws-sdk/client-s3` (Presigned URL uploads providing public HTTPS media URLs across both localhost development and production).
- **Forms & Validation:** Zod v4 (end-to-end runtime validation) + `react-hook-form` (`useFieldArray`, `useWatch`) + `@hookform/resolvers` for managing dynamic target cards.
- **Styling & UI:** Tailwind CSS + selective source primitives from `shadcn/ui` (Calendar, Tabs, Dialog, Select, Popover, Badge, Sheet) + `react-markdown`.
- **Authentication:** Better Auth (Discord OAuth, Steam OpenID, Email + server-side `ALLOWED_USERS_WHITELIST` hook).
- **Logging:** Custom zero-dependency structured JSON logger (`src/lib/logger.ts`).
- **Infrastructure:** Docker & Docker Compose + 1-minute system crontab trigger (deliberately excluding Redis, BullMQ, and external message brokers).

---

## 5. Repository Architecture

```text
cscl-smm-hub/
├── .github/workflows/deploy.yml # Automated CI/CD server deployment on git push
├── .env.example                # Sanitized environment variable template (zero secrets)
├── LICENSE                     # Proprietary All Rights Reserved (Source-Available) license
├── README.md                   # Portfolio showcase (screenshots, business impact, stack)
├── docker-compose.yml          # PostgreSQL 17 and application containers
├── Dockerfile                  # Multi-stage Next.js build (standalone mode)
├── prisma.config.ts            # Root Prisma 7 configuration
├── prisma/
│   ├── schema.prisma           # Prisma 7 schema (prisma-client provider)
│   └── backfill.ts             # CLI script for historical post import (Discord/TG/Site)
├── docs/
│   └── ARCHITECTURE.md         # Technical specification
└── src/
    ├── app/                    # Next.js 16 App Router
    │   ├── (auth)/login/       # Private login route
    │   ├── (dashboard)/        # Protected routes: /, /calendar, /posts, /analytics, /posts/new, /posts/[id], /settings
    │   └── api/
    │       ├── auth/[...all]/  # Better Auth handler
    │       └── cron/publish/   # Protected 1-minute scheduler endpoint
    ├── config/
    │   ├── env.ts              # Zod v4 validation for process.env
    │   └── platforms.ts        # Platform limits, categories, and Discord channel registry
    ├── modules/
    │   ├── posts/              # Server Actions, Zod v4 schemas, CRUD, exemplar queries
    │   └── scheduler/          # Atomic queue locking, Stale Lock Recovery, dispatcher
    ├── services/
    │   ├── social/             # Adapter Pattern for external social APIs
    │   │   ├── types.ts        # SocialPlatformAdapter contract + timeout wrapper
    │   │   ├── discord.ts      # Multi-channel Discord publishing + role pings
    │   │   ├── telegram.ts     # Text, photo, and MediaGroup Telegram publishing
    │   │   ├── site.ts         # CSCL Website publishing
    │   │   ├── twitter.ts      # X (Twitter) publishing
    │   │   ├── faceit.ts       # FACEIT publishing
    │   │   └── index.ts        # Adapter Registry (Factory)
    │   ├── storage/            # Cloudflare R2 (S3) media upload service
    │   └── ai/                 # Database-driven Few-Shot LLM service (Stage 5)
    ├── components/
    │   ├── ui/                 # shadcn/ui primitives
    │   ├── calendar/           # Schedule grid and time-slot cards
    │   └── editor/             # Post constructor, dynamic "+" target cards, Live Preview
    └── lib/
        ├── db.ts               # Prisma Client singleton
        ├── logger.ts           # Custom structured JSON server logger
        └── auth.ts             # Better Auth configuration + Whitelist Hook
```

---

## 6. Database Schema (Prisma 7 + PostgreSQL 17)

### 6.1. Stage 1 Core Schema (Walking Skeleton Migration)

Stage 1 contains the minimal posting and delivery model. The three categories map directly to the three Discord channels:

- `ANNOUNCEMENT` -> Discord `#announcements`
- `STANDINGS` -> Discord `#league-standings`
- `CS2_NEWS` -> Discord `#cs2-news` and general ecosystem news

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum Platform {
  DISCORD
  TELEGRAM
  TWITTER
  FACEIT
  SITE
}

enum PostCategory {
  ANNOUNCEMENT
  STANDINGS
  CS2_NEWS
}

enum PostStatus {
  DRAFT
  PUBLISHED
  PARTIAL
  FAILED
}

enum TargetStatus {
  PENDING
  PUBLISHED
  FAILED
}

model Post {
  id         String       @id @default(cuid())
  title      String?
  category   PostCategory @default(CS2_NEWS)
  content    String
  mediaUrls  String[]
  status     PostStatus   @default(DRAFT)
  isExemplar Boolean      @default(false)

  targets PostTarget[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PostTarget {
  id     String @id @default(cuid())
  postId String
  post   Post   @relation(fields: [postId], references: [id], onDelete: Cascade)

  platform   Platform
  channelKey String   @default("default")
  customText String?

  status      TargetStatus @default(PENDING)
  externalId  String?
  apiResponse Json?

  publishedAt DateTime?
  updatedAt   DateTime  @updatedAt

  @@unique([postId, platform, channelKey])
  @@unique([platform, externalId])
}
```

### 6.2. Incremental Schema Extensions (Stages 2–6)

- **Stage 2 — Scheduler:** Add `scheduledFor`, scheduler lock/status fields (`SCHEDULED`, `PROCESSING`), `metadata`, `retryCount`, and `@@index([status, scheduledFor])` to support queued, atomic publication.
- **Stage 4 — Authentication:** Add the Better Auth CLI-generated user, session, account, and verification tables, plus `authorId String?` on `Post`.
- **Stage 5 — AI & Exemplars:** Add `aiPrompt` and `@@index([category, isExemplar, status])` for category-specific few-shot retrieval.
- **Stage 6 — Analytics & Comments:** Add `metrics` and the `PostComment` table (`@@index([isReplied, createdAt])`) for delivery analytics and the unified comment inbox.

---

## 7. Core Engineering & Operational Mechanisms

### 7.1. Unified Social Adapter Contract (`SocialPlatformAdapter`)

Every module inside `src/services/social/` implements a strict contract with an enforced `AbortSignal.timeout(10000)`, `channelKey` routing support, and post-publication lifecycle methods by `externalId`:

- **`NATIVE_EDIT` Strategy (Discord, Telegram, CSCL Website):** The `edit()` method issues an in-place PATCH/edit request to update post text while preserving existing reactions, comments, and the original `externalId`.
- **`REPLACE_ON_EDIT` Strategy (X/Twitter, FACEIT):** Because the free X API v2 tier and FACEIT API do not support editing published text, updates execute only when explicitly checked by the operator via a `delete(externalId)` call followed by a fresh `publish(payload)` call, overwriting the new `externalId` in `PostTarget`.

```typescript
export type EditStrategy = "NATIVE_EDIT" | "REPLACE_ON_EDIT";

export interface PublishPayload {
  text: string;
  mediaUrls: string[];
  channelKey: string;
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  externalId?: string;
  rawResponse?: unknown;
  errorMessage?: string;
}

export interface SocialPlatformAdapter {
  readonly platform: Platform;
  readonly editStrategy: EditStrategy;
  publish(payload: PublishPayload): Promise<PublishResult>;
  edit?(externalId: string, payload: PublishPayload): Promise<PublishResult>;
  delete?(externalId: string, channelKey?: string): Promise<boolean>;
}
```

### 7.2. Fault-Tolerant Scheduler & Stale Lock Recovery

- **Stale Lock Recovery:** Before locking new jobs, the worker resets any `PROCESSING` posts whose `updatedAt` timestamp is older than 5 minutes (recovering from container restarts) back to `SCHEDULED`.
- **Atomic Lock:** Selects posts with `status` equal to `SCHEDULED` and `scheduledFor` at or before `NOW()`, atomically transitioning them to `PROCESSING`.
- **Isolated Concurrent Dispatch:** All child `PostTarget` records (`status` equal to `PENDING`) execute concurrently via `Promise.allSettled()`. Transient HTTP errors (`502`, `503`, `429`) trigger up to 3 automatic retries.
- **Status Aggregation:** The master `Post` status resolves automatically to `PUBLISHED`, `PARTIAL`, or `FAILED`.

### 7.3. Operational Standards (Timezones, Media Pre-Validation, Accidental Push Guard)

- **Unified Timezone Standard:** All database timestamps are stored strictly in UTC, while the calendar and editor UI display times in the selected tournament timezone (e.g., CET/MSK) paired with a dynamic Discord timestamp generator.
- **Client-Side Media Pre-Validation:** Prior to uploading to Cloudflare R2, the client validates file format (PNG/JPG/WEBP) and size (up to 5 MB), preventing downstream Telegram and X API rejections at publication time.
- **Accidental Push Guard:** The "Publish Now" action requires confirmation to prevent accidental immediate publishing during weekly batch-scheduling sessions.
- **Time-Window Clustering Backfill & Two-Tier Disaster Recovery:** The synchronization service fetches active posts from the fixed archive epoch date (`ARCHIVE_EPOCH_DATE` in `.env`) from the 3 thematic Discord channels with deterministic 1-to-1 category mapping (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`), the CSCL Website API, and Telegram JSON exports, normalizing timestamps to UTC. If platforms have one publication on a given calendar day, they are automatically merged into a single master `Post` with multiple `PostTarget` cards; if multiple posts were published on the same day, they are clustered by the nearest time window (plus or minus 30 minutes). Enforced by the unique constraint on `platform` and `externalId`, the sync process is fully idempotent (`upsert`) and reconstructs 100% of the published archive and exemplars directly from external platforms in the event of complete database loss, while future scheduled posts (`SCHEDULED`) and drafts (`DRAFT`) are protected via an automated daily PostgreSQL dump (`pg_dump`) uploaded to Cloudflare R2 object storage.

### 7.4. Source-Available Licensing, Documentation & GitHub CI/CD Updates

- **Proprietary Code Protection (Source-Available):** The GitHub repository is public for engineering portfolio review but legally protected against unauthorized use. `package.json` enforces `"private": true` and `"license": "UNLICENSED"`, paired with a root `LICENSE` file stating `Copyright (c) 2026 CSCL. All Rights Reserved.`
- **Zero Secrets in Code Policy:** All API credentials, Discord webhook URLs, Cloudflare R2 keys, and `ALLOWED_USERS_WHITELIST` are stored strictly in the server-side `.env` file (excluded via `.gitignore`). Only a sanitized `.env.example` template is committed to Git.
- **Two-Tier Documentation:** This SRS & SAD specification lives in `docs/ARCHITECTURE.md` for deep technical review by engineering leads, while the root `README.md` serves as a visual product showcase featuring business impact metrics, architecture diagrams, and UI screenshots.
- **Continuous Deployment via GitHub (GitHub Actions CI/CD):** Once deployed, all future updates are shipped via a standard `git push` to the `main` branch. The `.github/workflows/deploy.yml` pipeline automatically connects to the CSCL server over SSH, pulls the latest commit, runs database migrations (`npx prisma migrate deploy`), and rebuilds/restarts the Docker container with zero downtime or manual intervention.

---

## 8. Implementation Roadmap (Walking Skeleton Approach)

Development progresses in vertical slices — starting with an end-to-end working skeleton before layering complex UI, AI, and analytics features.

### Stage 1: Walking Skeleton (DB + R2 Storage + Real Posting + History Backfill)

- **Task 1.1 (Bootstrap & Environment):** Initialize `cscl-smm-hub` (Next.js 16, TypeScript strict), configure `docker-compose.yml` with PostgreSQL 17, and implement Zod v4 environment validation (`src/config/env.ts`).
- **Task 1.2 (Database Schema & Migration):** Define `Post` and `PostTarget` models in `prisma/schema.prisma` (including categories `ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`, `channelKey`, `isExemplar`), run the initial migration, and create the `src/lib/db.ts` singleton.
- **Task 1.3 (Cloudflare R2 Media Service):** Implement `src/services/storage/r2.ts` using `@aws-sdk/client-s3` for uploading banners and returning public HTTPS URLs.
- **Task 1.4 (Core Adapters — Discord & Telegram):** Define `SocialPlatformAdapter` and implement real publishing to Discord channels (via `channelKey`) and Telegram.
- **Task 1.5 (Minimal CRUD & Instant Publish):** Build foundational `/posts/new` and `/posts` pages connected via Server Actions and verify real end-to-end publishing to test Discord and Telegram channels.
- **Task 1.6 (Time-Window Clustered Backfill & Idempotent Sync):** Build the `prisma/backfill.ts` CLI script (and sync service) to fetch historical posts from the fixed archive epoch date (`ARCHIVE_EPOCH_DATE`), auto-assign categories 1-to-1 from the 3 thematic Discord channels, merge cross-platform posts published on the same day or within a 30-minute window into a unified `Post` with child `PostTarget` records, and persist them via idempotent `upsert` by `externalId` (supporting both initial Backfill and Disaster Recovery).

### Stage 2: Scheduler Queue, Dynamic "+" Targets & Structured Logging

- **Task 2.1 (Custom JSON Logger):** Implement the zero-dependency structured logger (`src/lib/logger.ts`) for scheduler events and API error tracking.
- **Task 2.2 (Dynamic "+" Target Cards):** Integrate `react-hook-form` (`useFieldArray`) into `/posts/new` to dynamically add/remove multiple `PostTarget` cards (distinct Discord channels, custom text overrides, role pings).
- **Task 2.3 (Scheduler Engine & Cron Endpoint):** Build `SchedulerService` and the protected `POST /api/cron/publish` route (`CRON_SECRET` verification, stale lock recovery, concurrent `Promise.allSettled` dispatch).
- **Task 2.4 (Post Inspector `/posts/[id]`, Granular Retry & Dual-Mode Edit):** Build the post details view displaying per-target JSONB API logs, one-click retry targeting `FAILED` cards, dual-mode editing (default `NATIVE_EDIT` for Discord/TG/Site and opt-in `REPLACE_ON_EDIT` checkbox for X/FACEIT), and deletion via `externalId`.

### Stage 3: Production UI, Calendar, Live Preview & Remaining Adapters

- **Task 3.1 (Tabbed Live Preview & Limit Validation):** Install `shadcn/ui` primitives and `react-markdown`, building reactive previews per target card (`useWatch`) with character and line limit warnings (280 for X, 340 characters and max 3 lines for FACEIT Feed to avoid "Read more" collapsing, 1024 with media / 4096 for Telegram, and 2000 for Discord and the CSCL Website).
- **Task 3.2 (Compact Registry `/posts`, Calendar `/calendar` & Dashboard `/`):** Build the `/posts` list using the **Compact Row List + Slide-over Sheet** pattern (with +7d cloning and Delta Sync), the `/calendar` grid, and the operational `/` dashboard.
- **Task 3.3 (Settings Page `/settings`):** Build the management UI for Discord channel routing (`channelKey`) and global season variables (promo codes, registration links).
- **Task 3.4 (CSCL Site, X & FACEIT Adapters):** Implement and register production adapters for the CSCL Website, X API v2, and FACEIT API.

### Stage 4: Perimeter Security & Production Deployment

- **Task 4.1 (Better Auth + Whitelist Hook):** Configure Discord, Steam, and Email authentication enforced by `ALLOWED_USERS_WHITELIST` and protect routes via `src/middleware.ts`.
- **Task 4.2 (Docker Packaging, Subdomain Deployment & CI/CD):** Create the multi-stage `Dockerfile` (`standalone`), deploy containers to the CSCL server with SSL, configure the 1-minute system crontab, and set up GitHub Actions (`.github/workflows/deploy.yml`) for automated server updates on `git push`.

### Stage 5: Database-Driven Few-Shot AI Assistant

- **Task 5.1 (AI Service with DB Exemplar Lookup):** Build `src/services/ai/` to query the 3 most recent `isExemplar: true` posts for the selected category from PostgreSQL and inject them as few-shot style examples into the system prompt.
- **Task 5.2 (Multi-Format Editor Generation):** Add the AI prompt modal to `/posts/new` to automatically populate the master Markdown post alongside concise overrides for X (up to 280 chars) and FACEIT Feed (up to 340 chars and max 3 lines without "Read more" truncation).

### Stage 6: Sponsor Analytics (Main Site Tracker Integration) & Unified Comment Inbox

- **Task 6.1 (Main CSCL Site Click Tracker Integration):** Configure automatic UTM/short-link tagging on `PostTarget` publication and periodic polling of the main CSCL website internal API to record exact click counts in the `metrics` field.
- **Task 6.2 (Zero-Cost Social Metrics Collector & `/analytics` Page):** Implement automated collection of views and reactions (via Discord/Site APIs, public Telegram widgets, and X syndication endpoints) and build the `/analytics` sponsor report screen.
- **Task 6.3 (Dashboard Unified Comment Inbox):** Connect webhooks/polling from Telegram discussion groups, Discord threads, and CSCL website comments into the `PostComment` table with inline reply actions on the `/` dashboard.
