# CSCL SMM Hub — Technical Specification & Architecture (SRS & SAD / Design Doc)

**Document Status:** Approved for Development (v2.3 — Evolutionary Schema, Top-Down Walking Skeleton & N-to-1 Channel Mapping)  
**Repository:** `cscl-smm-hub`  
**System Type:** Internal Corporate Web Dashboard (Internal Tool / B2B SaaS Architecture) hosted on a dedicated subdomain within the CSCL ecosystem.  
**Repository Mode & License:** Public Source-Available (`UNLICENSED` / All Rights Reserved — public code visibility for engineering portfolio review with legal prohibition of commercial copying and strict Zero Secrets in Code isolation).

---

# 1. Purpose & Business Goals

**CSCL SMM Hub** is a centralized pipeline for drafting, validating, scheduling, archiving history, and automatically publishing content across the CSCL esports ecosystem.

## Key Business Objectives

1. **Batch Scheduling:** Enable the content manager to prepare a batch of posts for a full day or week in a single session and assign them to specific time slots in an interactive calendar.
2. **Flexible Multi-Posting via Dynamic Target Cards ("+"):** Publish across 5 target channels (**Discord**, **Telegram**, **X / Twitter**, **FACEIT**, and the **CSCL Website**) with the ability to add multiple target cards via a "+" button (for example, targeting multiple Discord channels with distinct text and role pings in a single post) or exclude any platform with one click.
3. **Deterministic N-to-1 Categorization & Exemplar Knowledge Base:** Organize posts into 4 abstract business categories deterministically mapped from Discord channels via the registry (`#announcements` -> `ANNOUNCEMENT`, `#league-standings` -> `STANDINGS`, `#cs2-news` -> `CS2_NEWS`, sponsor channels such as `#esea-latest-news` -> `SPONSOR` with an `archived` flag for completed partnerships), backfill historical posts from the fixed archive epoch date (`ARCHIVE_EPOCH_DATE`), and reuse top-performing posts (`isExemplar`) as templates and AI few-shot examples.
4. **Human-Error Prevention:** Automated enforcement of character limits, media file size/format rules, and Markdown rules per target card, paired with an interactive **Live Preview** prior to publishing.
5. **Fault Tolerance & Granular Retry:** External API failure isolation, strict 10-second timeouts, automated retries for transient network errors, stale lock recovery, and one-click retries for failed targets only.
6. **History-Driven AI Assistant (Stage 5):** Automated draft generation from tournament/match bullet points using real category exemplars queried directly from PostgreSQL (**Few-Shot Prompting**), governed by mandatory human review (**Human-in-the-Loop**).
7. **Sponsor Analytics & Unified Comment Inbox (Stage 6):** Zero-cost collection of reach and engagement metrics across platforms paired with the main CSCL website link tracker for one-click sponsor reports, plus a Unified Comment Inbox on the main dashboard.

---

# 2. Page Map & Application Routing

The UI architecture is divided into dedicated operational screens with zero functional overlap:

- `/login` **(Authentication):** Invite-only login screen supporting Discord OAuth, Steam OpenID, and Email (enforced via a strict server-side Whitelist).
- `/` **(Dashboard — Operational Summary):** Primary control center displaying `FAILED` and `PARTIAL` posts requiring immediate Retry, the upcoming 24-hour publication queue, weekly publishing metrics, and the **Unified Comment Inbox** (unanswered questions from Telegram discussion groups, Discord threads, and the CSCL website with inline reply support, plus direct thread links for X and FACEIT) with 30-second auto-refresh polling.
- `/calendar` **(Interactive Schedule Grid):** Day and week calendar view with category color-coding (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`, `SPONSOR`) and tournament timezone locking for batch scheduling.
- `/posts` **(Post Archive & Registry):** Complete searchable table of all posts (including backfilled historical records) using the **Compact Row List + Slide-over Sheet** UI pattern (60px compact rows with status filter tabs, one-click "+7 days" post cloning, manual Delta Sync button for external posts, and a slide-over preview sheet).
- `/analytics` **(Sponsor Analytics & Reports):** Aggregated metrics dashboard (views, likes, reactions + exact click counts synced from the main CSCL website tracker) filterable by category, sponsor campaigns, and tournament dates for exporting reports.
- `/posts/new` **(Multi-Posting Constructor):** Primary workspace for creating posts:
  - Category selector (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`, `SPONSOR`) with automatic default active Discord channel pre-selection (when the category has a single active channel; when multiple active sponsor channels exist, the operator picks the target channel without overwriting manual overrides) and "Pre-fill from category exemplar" action.
  - Master Markdown editor, dynamic Discord timestamp generator, and Drag-and-Drop banner uploader connected directly to Cloudflare R2 (S3).
  - Dynamic target cards list (Smart Defaults + "+" button powered by `useFieldArray`): initializes with a configurable default preset of active registered platforms; any card can be removed in one click (0 cards allowed for `DRAFT`, minimum 1 required for publishing/scheduling), while "+" only offers unused `(platform, channelKey)` pairs from currently implemented adapters (blocking duplicates in the UI) with optional `customText` overrides and platform metadata (Discord role pings, link preview toggles).
  - Tabbed **Live Preview** panel powered by `useWatch` and reactive character counters per card.
- `/posts/[id]` **(Post Inspector, Logs & Editor):** Full edit form for `DRAFT` and `SCHEDULED` posts; granular delivery status monitor, raw JSONB API response viewer, and per-target Retry actions for `FAILED` targets. For already published posts (`PUBLISHED`), supports dual-mode editing via saved `externalId`: in-place native editing (`NATIVE_EDIT` enabled by default for Discord, Telegram, and CSCL Website) and opt-in delete-and-repost replacement (`REPLACE_ON_EDIT` via an unchecked-by-default "Recreate post" checkbox for X/Twitter and FACEIT to protect the free X API write quota and existing tweet view counts). For already published posts (`PUBLISHED`), target cards cannot be silently removed from the form — removal requires an explicit "Delete post on platform" action (`adapter.delete(externalId)`).
- `/settings` **(Integrations & Channel Routing):** Read-only status monitoring and health-check interface for the Discord channel registry (`channelKey` to Webhook / Channel ID: `announcements`, `league-standings`, `cs2-news`, plus sponsor channels, e.g., `esea-latest-news`, supporting an `archived` flag for past contracts) and platform API tokens stored strictly in `.env` (enforcing Zero Secrets), paired with editable global season variables (active promo code `cscl`, hub and tournament URLs) and a configurable default platform preset (`default_targets`) for `/posts/new`, persisted in the `AppSetting` PostgreSQL table.

---

# 3. Target Platforms & Constraints Matrix (Platform Registry)

| Platform         | Identifier | Character Limit                                     | Markdown Support                           | Max Media Files | Integration Method                             |
| :--------------- | :--------- | :-------------------------------------------------- | :----------------------------------------- | :-------------- | :--------------------------------------------- |
| **Discord**      | `DISCORD`  | 2000                                                | Yes (Discord MD + role pings & timestamps) | 10              | Discord Webhook / Bot REST API (multi-channel) |
| **Telegram**     | `TELEGRAM` | 4096 (1024 with media)                              | Yes (MarkdownV2 / HTML)                    | 10 (MediaGroup) | Telegram Bot HTTP API                          |
| **X (Twitter)**  | `TWITTER`  | 280                                                 | No (Plain text)                            | 4               | X API v2 (OAuth 2.0, free tier write quota)    |
| **FACEIT**       | `FACEIT`   | 340 (max 3 lines to prevent "Read more" truncation) | Yes                                        | 1               | FACEIT Organizer / Hub API                     |
| **CSCL Website** | `SITE`     | 2000                                                | Yes (Full MD)                              | 10              | Internal Protected REST / Webhook              |

---

# 4. Approved Technology Stack (2026)

Engineered around the **Zero-Bloat Production Stack** principle — enterprise reliability without unnecessary infrastructure overhead:

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions; React Compiler & Cache Components disabled).
- **Language:** TypeScript 5+ (`strict: true`, `noUncheckedIndexedAccess: true`, zero `any` policy).
- **Database & ORM:** PostgreSQL 17 + Prisma 7 (`provider = "prisma-client"` with `@prisma/adapter-pg` and `pg`, ACID transactions, composite indexes, and JSONB storage for API payloads and platform metadata).
- **Object Media Storage:** Cloudflare R2 + `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` (direct client-side Presigned URL uploads without server-side Buffer proxying, providing public HTTPS media URLs across both localhost development and production).
- **Forms & Validation:** Zod v4 (end-to-end runtime validation) + `react-hook-form` (`useFieldArray`, `useWatch`) + `@hookform/resolvers` for managing dynamic target cards.
- **Styling & UI:** Tailwind CSS + selective source primitives from `shadcn/ui` (Calendar, Tabs, Dialog, Select, Popover, Badge, Sheet) + `react-markdown`.
- **Authentication:** Better Auth (Discord OAuth, Steam OpenID, Email + server-side `ALLOWED_USERS_WHITELIST` hook).
- **Logging:** Custom zero-dependency structured JSON logger (`src/lib/logger.ts`).
- **Infrastructure:** Docker & Docker Compose + 1-minute system `crontab` trigger (deliberately excluding Redis, BullMQ, and external message brokers).

---

# 5. Repository Architecture

```text
cscl-smm-hub/
├── .github/workflows/deploy.yml # Automated CI/CD server deployment on git push
├── .env.example                 # Sanitized environment variable template (zero secrets)
├── LICENSE                      # Proprietary All Rights Reserved (Source-Available) license
├── README.md                    # Portfolio showcase (screenshots, business impact, stack)
├── docker-compose.yml           # PostgreSQL 17 and application containers
├── Dockerfile                   # Multi-stage Next.js build (standalone mode)
├── prisma.config.ts             # Prisma 7 CLI & migration datasource configuration
├── prisma/
│   ├── schema.prisma            # Database schema (evolves incrementally across stages)
│   └── backfill.ts              # CLI script for historical post import (Discord/TG/Site)
├── docs/
│   └── ARCHITECTURE.md          # Technical specification
└── src/
    ├── proxy.ts                 # Next.js 16 (replaces middleware.ts): fast cookie redirect guard; full session & Whitelist check runs server-side
    ├── app/                     # Next.js 16 App Router
    │   ├── (auth)/login/        # Private login route
    │   ├── (dashboard)/         # Protected routes: /, /calendar, /posts, /analytics, /posts/new, /posts/[id], /settings
    │   └── api/
    │       ├── auth/[...all]/   # Better Auth handler
    │       └── cron/publish/    # Protected 1-minute scheduler endpoint
    ├── config/
    │   ├── env.ts               # Zod v4 validation for process.env (incremental YAGNI schema)
    │   └── platforms.ts         # Platform limits, categories, and Discord channel registry
    ├── modules/
    │   ├── posts/               # Server Actions, Zod v4 schemas, CRUD, exemplar queries
    │   └── scheduler/           # Atomic queue locking, Stale Lock Recovery, dispatcher
    ├── services/
    │   ├── social/              # Adapter Pattern for external social APIs
    │   │   ├── types.ts         # SocialPlatformAdapter contract + timeout wrapper
    │   │   ├── discord.ts       # Multi-channel Discord publishing + role pings
    │   │   ├── telegram.ts      # Text, photo, and MediaGroup Telegram publishing
    │   │   ├── site.ts          # CSCL Website publishing
    │   │   ├── twitter.ts       # X (Twitter) publishing
    │   │   ├── faceit.ts        # FACEIT publishing
    │   │   └── index.ts         # Adapter Registry (Factory)
    │   ├── storage/             # Presigned URL generator for direct client uploads to Cloudflare R2 (S3)
    │   └── ai/                  # Database-driven Few-Shot LLM service (Stage 5)
    ├── components/
    │   ├── ui/                  # shadcn/ui primitives
    │   ├── calendar/            # Schedule grid and time-slot cards
    │   └── editor/              # Post constructor, dynamic "+" target cards, Live Preview
    └── lib/
        ├── db.ts                # Prisma Client singleton (@prisma/adapter-pg)
        ├── logger.ts            # Custom structured JSON server logger
        └── auth.ts              # Better Auth configuration + Whitelist Hook
```

---

# 6. Database Schema (Prisma 7 + PostgreSQL 17 — Evolutionary Design)

Following the **Walking Skeleton & YAGNI** principle, the database schema evolves incrementally across stages via atomic Prisma migrations rather than creating unused tables upfront.

## 6.1. Stage 1 Core Schema (Walking Skeleton Migration)

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
  ANNOUNCEMENT // Discord #announcements channel
  STANDINGS    // Discord #league-standings channel
  CS2_NEWS     // Discord #cs2-news & general ecosystem updates
  SPONSOR      // Sponsor Discord channels (N-to-1 registry mapping, e.g. #esea-latest-news)
}

enum PostStatus {
  DRAFT       // Saved draft
  PUBLISHED   // Successfully published across all assigned target cards
  PARTIAL     // Partially published (some target cards succeeded, others FAILED)
  FAILED      // Publication failed across all assigned target cards
}

enum TargetStatus {
  PENDING     // Awaiting dispatch
  PUBLISHED   // Successfully published on the target channel
  FAILED      // External platform API error
}

model Post {
  id        String       @id @default(cuid())
  title     String?      // Optional internal title for calendar & registry readability
  category  PostCategory @default(CS2_NEWS)
  content   String       // Master post content (Markdown)
  mediaUrls String[]     // Public HTTPS URLs hosted on Cloudflare R2
  status    PostStatus   @default(DRAFT)

  targets   PostTarget[] // Dynamic array of target delivery cards ("+")

  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
}

model PostTarget {
  id          String       @id @default(cuid())
  postId      String
  post        Post         @relation(fields: [postId], references: [id], onDelete: Cascade)

  platform    Platform
  status      TargetStatus @default(PENDING)
  externalId  String?      // External message/post ID returned by the platform API
  publishedAt DateTime?
  updatedAt   DateTime     @updatedAt

  @@unique([postId, platform])     // Stage 1 baseline constraint (expanded to [postId, platform, channelKey] in Stage 2)
  @@unique([platform, externalId]) // Idempotency for Backfill, Delta Sync, and Database Disaster Recovery
}
```

## 6.2. Incremental Schema Extensions (Stages 2–6)

- **Stage 2 (Dynamic "+" Cards, Logs & Scheduler):**
  - **Target Cards & Logs Migration (Task 2.2):** Adds `channelKey String @default("default")`, `customText String?`, `metadata Json?`, and `apiResponse Json?` to `PostTarget`, and replaces `@@unique([postId, platform])` with `@@unique([postId, platform, channelKey])`.
  - **Scheduler Migration (Task 2.4):** Extends `PostStatus` with `SCHEDULED` and `PROCESSING`; adds `scheduledFor DateTime?` and `@@index([status, scheduledFor])` to `Post`; adds `retryCount Int @default(0)` to `PostTarget`.
- **Stage 3 (Exemplars & App Settings):** Adds `isExemplar Boolean @default(false)` to `Post` (Task 3.2) and introduces the `AppSetting` table (`key String @id`, `value Json`, `updatedAt DateTime @updatedAt`) storing editable season variables and the `default_targets` preset for `/settings` (Task 3.3).
- **Stage 4 (Better Auth):** Adds `User`, `Session`, `Account`, and `Verification` tables deterministically via `npx @better-auth/cli generate`, plus `authorId String?` on `Post`.
- **Stage 5 (AI Few-Shot):** Adds `aiPrompt String?` and `@@index([category, isExemplar, status])` to `Post`.
- **Stage 6 (Analytics & Comment Inbox):** Adds `metrics Json?` to `PostTarget` and introduces the `PostComment` model (`@@index([isReplied, createdAt])`).

---

# 7. Core Engineering & Operational Mechanisms

## 7.1. Unified Social Adapter Contract (`SocialPlatformAdapter`)

Every module inside `src/services/social/` implements a strict contract with an enforced `AbortSignal.timeout(10000)`, `channelKey` routing support, and post-publication lifecycle methods by `externalId`:

- **`NATIVE_EDIT` Strategy (Discord, Telegram, CSCL Website):** The `edit()` method issues an in-place PATCH/edit request to update post text while preserving existing reactions, comments, and the original `externalId`.
- **`REPLACE_ON_EDIT` Strategy (X/Twitter, FACEIT):** Because the free X API v2 tier and FACEIT API do not support editing published text, updates execute only when explicitly checked by the operator via a `delete(externalId)` call followed by a fresh `publish(payload)` call, overwriting the new `externalId` in `PostTarget`.

```ts
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

## 7.2. Fault-Tolerant Scheduler & Stale Lock Recovery (Stage 2)

1. **Stale Lock Recovery:** Before locking new jobs, the worker resets any `PROCESSING` posts whose `updatedAt` timestamp is older than 5 minutes (recovering from container restarts) back to `SCHEDULED`.
2. **Atomic Lock:** Selects posts with `status = 'SCHEDULED'` and `scheduledFor <= NOW()`, atomically transitioning them to `PROCESSING`.
3. **Isolated Concurrent Dispatch:** All child `PostTarget` records (`status = 'PENDING'`) execute concurrently via `Promise.allSettled()`. Transient HTTP errors (502, 503, 429) trigger up to 3 automatic retries.
4. **Status Aggregation:** The master `Post` status resolves automatically to `PUBLISHED`, `PARTIAL`, or `FAILED`.

## 7.3. Operational Standards (Timezones, Media Pre-Validation, Accidental Push Guard)

- **Registry-Driven UI & Three-Layer Duplicate Protection (Poka-Yoke):** The `/posts/new` constructor and "+" button render strictly from implemented and registered adapters in `src/config/platforms.ts` / `src/services/social/index.ts` rather than the raw database `Platform` enum, enabling incremental one-by-one platform rollout without dead cards. Uniqueness of `(platform, channelKey)` pairs is enforced across three layers: disabling/hiding already selected platforms and Discord channels in the UI, `.superRefine()` validation in Zod v4, and `@@unique([postId, platform, channelKey])` in PostgreSQL.
- **Unified Timezone Standard:** All database timestamps are stored strictly in UTC, while the calendar and editor UI display times in the selected tournament timezone (e.g., CET/MSK) paired with a dynamic Discord timestamp generator.
- **Client-Side Media Pre-Validation:** Prior to uploading to Cloudflare R2, the client validates file format (PNG/JPG/WEBP) and size (up to 5 MB), preventing downstream Telegram and X API rejections at publication time.
- **Accidental Push Guard:** The "Publish Now" action requires confirmation to prevent accidental immediate publishing during weekly batch-scheduling sessions.
- **Time-Window Clustering Backfill & Two-Tier Disaster Recovery:** The synchronization service fetches active posts from the fixed archive epoch date (`ARCHIVE_EPOCH_DATE` in `.env`) from all Discord channels in the registry (including `archived: true` channels from past sponsor contracts) with deterministic N-to-1 category mapping (`#announcements` -> `ANNOUNCEMENT`, `#league-standings` -> `STANDINGS`, `#cs2-news` -> `CS2_NEWS`, `#esea-latest-news` and other sponsor channels -> `SPONSOR`), the CSCL Website API, and Telegram JSON exports, normalizing timestamps to UTC. If platforms have one publication on a given calendar day, they are automatically merged into a single master `Post` with multiple `PostTarget` cards; if multiple posts were published on the same day, they are clustered by the nearest time window (plus or minus 30 minutes). Enforced by the unique constraint on `platform` and `externalId`, the sync process is fully idempotent (`upsert`) and reconstructs 100% of the published archive and exemplars directly from external platforms in the event of complete database loss, while future scheduled posts (`SCHEDULED`) and drafts (`DRAFT`) are protected via an automated daily PostgreSQL dump (`pg_dump`) uploaded to Cloudflare R2 object storage.

## 7.4. Source-Available Licensing, Documentation & GitHub CI/CD Updates

- **Proprietary Code Protection (Source-Available):** The GitHub repository is public for engineering portfolio review but legally protected against unauthorized use. `package.json` enforces `"private": true` and `"license": "UNLICENSED"`, paired with a root `LICENSE` file stating `Copyright (c) 2026 CSCL. All Rights Reserved.`
- **Zero Secrets in Code Policy:** All API credentials, Discord webhook URLs, Cloudflare R2 keys, and `ALLOWED_USERS_WHITELIST` are stored strictly in the server-side `.env` file (excluded via `.gitignore`). Only a sanitized `.env.example` template is committed to Git.
- **Two-Tier Documentation:** This SRS & SAD specification lives in `docs/ARCHITECTURE.md` for deep technical review by engineering leads, while the root `README.md` serves as a visual product showcase featuring business impact metrics, architecture diagrams, and UI screenshots.
- **Continuous Deployment via GitHub (GitHub Actions CI/CD):** Once deployed, all future updates are shipped via a standard `git push` to the `main` branch. The `.github/workflows/deploy.yml` pipeline automatically connects to the CSCL server over SSH, pulls the latest commit, runs database migrations (`npx prisma migrate deploy`), and rebuilds/restarts the Docker container with zero downtime or manual intervention.

---

# 8. Implementation Roadmap (Walking Skeleton Approach)

Development progresses in vertical slices — starting with an end-to-end working skeleton before layering complex UI, AI, and analytics features.

## Stage 1: Walking Skeleton (DB + R2 Storage + Base UI/CRUD + Real Posting)

- **Task 1.1 (Bootstrap & Environment):** Initialize `cscl-smm-hub` (Next.js 16, TypeScript strict), configure `docker-compose.yml` with PostgreSQL 17, and implement incremental Zod v4 environment validation (`src/config/env.ts`).
- **Task 1.2 (Database Schema & Migration):** Define minimal Stage 1 YAGNI `Post` and `PostTarget` models in `prisma/schema.prisma` (with deterministic categories `ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS` plus an incremental migration adding the abstract `SPONSOR` category before Task 1.4, and unique constraints `@@unique([postId, platform])`, `@@unique([platform, externalId])`), run the initial migration, and create the `src/lib/db.ts` singleton using `@prisma/adapter-pg`.
- **Task 1.3 (Cloudflare R2 Media Service):** Implement `src/services/storage/r2.ts` using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` to generate Presigned URLs for direct client banner uploads and return public HTTPS URLs.
- **Task 1.4 (Minimal UI, CRUD & R2 Upload Verification):** Build the navigation shell and foundational `/posts` and `/posts/new` pages, wire form submission via Server Actions to PostgreSQL, and verify direct client-side banner uploads to Cloudflare R2 via Presigned URLs in the browser.
- **Task 1.5a (Adapter Contract, Active Platform Registry & First Adapter — Discord):** Define `SocialPlatformAdapter`, build the active platform registry (`src/config/platforms.ts` + factory `src/services/social/index.ts`), implement the Discord adapter, add a confirmation-guarded "Publish Now" action, and verify the complete end-to-end cycle on a test Discord channel.
- **Task 1.5b (Incremental Second Adapter — Telegram):** Implement and register the Telegram adapter in the registry, confirm it automatically surfaces in the UI, and verify real text and image publishing to a test Telegram channel.

## Stage 2: Post Inspector, Dynamic "+" Targets, Logging & Scheduler Queue

- **Task 2.1 (Post Details `/posts/[id]` & Native Edit/Delete):** Build the `/posts/[id]` view for inspecting, editing, and deleting `DRAFT` posts, displaying per-target statuses, and supporting `NATIVE_EDIT` and deletion via `externalId` for published Discord and Telegram posts.
- **Task 2.2 (Dynamic "+" Target Cards, Smart Defaults & Schema Migration):** Apply the `PostTarget` migration (`channelKey`, `customText`, `metadata`, `apiResponse`, `@@unique([postId, platform, channelKey])`), integrate `react-hook-form` (`useFieldArray`) into `/posts/new` with Smart Defaults pre-population from active platforms, one-click card removal (0 cards allowed for `DRAFT`, minimum 1 for publishing/scheduling), N-to-1 Discord channel registry with `archived` support (auto-selecting the channel on category change when a single active channel exists, or letting the operator choose among multiple active sponsor channels without overwriting manual edits), and 3-layer `(platform, channelKey)` duplicate protection (UI Poka-Yoke + Zod `.superRefine()` + DB), plus display JSONB `apiResponse` logs on `/posts/[id]`.
- **Task 2.3 (Custom JSON Logger):** Implement the zero-dependency structured logger (`src/lib/logger.ts`) for scheduler events and API error tracking.
- **Task 2.4 (Scheduler Engine, Cron Endpoint & Granular Retry):** Extend Prisma schema with scheduler fields (`SCHEDULED`, `PROCESSING`, `scheduledFor`, `retryCount`), build `SchedulerService` and the protected `POST /api/cron/publish` route (`CRON_SECRET` verification, stale lock recovery, concurrent `Promise.allSettled` dispatch with retries), and add one-click per-target Retry for `FAILED` cards on `/posts/[id]`.

## Stage 3: Production UI, Calendar, Live Preview, Remaining Adapters & History Backfill

- **Task 3.1 (Tabbed Live Preview & Limit Validation):** Install `shadcn/ui` primitives and `react-markdown`, building reactive previews per target card (`useWatch`) with character and line limit warnings.
- **Task 3.2 (Compact Registry `/posts`, Calendar `/calendar` & Dashboard `/`):** Add `isExemplar` to `Post` via Prisma migration; build the `/posts` list using the **Compact Row List + Slide-over Sheet** pattern (with exemplar toggle, +7d cloning, and Delta Sync trigger), the `/calendar` grid, and the operational `/` dashboard.
- **Task 3.3 (Settings Page `/settings`):** Add the `AppSetting` (`key`, `value Json`) table via Prisma migration; build read-only `.env` Discord channel/token health-checks alongside editable global season variables (promo codes, registration links) and the configurable default target cards preset (`default_targets`) for `/posts/new`.
- **Task 3.4 (Incremental CSCL Site, X & FACEIT Adapters + `REPLACE_ON_EDIT`):** Incrementally implement, register, and verify production adapters one by one in separate atomic commits via the active platform registry (CSCL Website with `NATIVE_EDIT`, then X API v2, then FACEIT API), and add the opt-in `REPLACE_ON_EDIT` ("Recreate post" checkbox, unchecked by default) workflow on `/posts/[id]`.
- **Task 3.5 (Time-Window Clustered Backfill & Idempotent Sync):** Build the `prisma/backfill.ts` CLI script and Delta Sync service to fetch historical posts from `ARCHIVE_EPOCH_DATE` across all registered Discord channels (including `archived: true`, N-to-1 mapping `#announcements`, `#league-standings`, `#cs2-news`, `#esea-latest-news` -> `SPONSOR`), Telegram JSON exports, and the CSCL Website API, merge cross-platform posts published on the same day or within a 30-minute window into a unified `Post` with child `PostTarget` records, and persist them via idempotent `upsert` by `externalId`.

## Stage 4: Perimeter Security & Production Deployment

- **Task 4.1 (Better Auth + Whitelist Hook):** Generate Better Auth Prisma tables via `@better-auth/cli`, configure Discord, Steam, and Email authentication enforced by `ALLOWED_USERS_WHITELIST`, and protect routes via `src/proxy.ts` (Next.js 16 fast cookie redirect guard, paired with strict server-side session and `ALLOWED_USERS_WHITELIST` enforcement in Server Components and Server Actions).
- **Task 4.2 (Docker Packaging, Subdomain Deployment & CI/CD):** Create the multi-stage `Dockerfile` (`standalone`), deploy containers to the CSCL server with SSL, configure the 1-minute system `crontab`, and set up GitHub Actions (`.github/workflows/deploy.yml`).

## Stage 5: Database-Driven Few-Shot AI Assistant

- **Task 5.1 (AI Service with DB Exemplar Lookup):** Extend schema with `aiPrompt`, build `src/services/ai/` to query the 3 most recent `isExemplar: true` posts for the selected category (`ANNOUNCEMENT`, `STANDINGS`, `CS2_NEWS`, `SPONSOR`) from PostgreSQL and inject them as few-shot style examples; for `SPONSOR` posts, exemplar lookup additionally filters by `channelKey` so tone and copy from one sponsor do not bleed into another.
- **Task 5.2 (Multi-Format Editor Generation):** Add the AI prompt modal to `/posts/new` to automatically populate the master Markdown post alongside concise overrides for X (up to 280 chars) and FACEIT Feed (up to 340 chars and max 3 lines).

## Stage 6: Sponsor Analytics & Unified Comment Inbox

- **Task 6.1 (Main CSCL Site Click Tracker Integration):** Extend schema with `metrics`, configure automatic UTM/short-link tagging on `PostTarget` publication and periodic polling of the main CSCL website internal API.
- **Task 6.2 (Zero-Cost Social Metrics Collector & `/analytics` Page):** Implement automated collection of views and reactions and build the `/analytics` report screen (enabling filtering across all sponsors via `category = SPONSOR` and per individual sponsor via `PostTarget.channelKey` without a separate `Sponsor` table per YAGNI).
- **Task 6.3 (Dashboard Unified Comment Inbox):** Add `PostComment` model and connect webhooks/polling from Telegram discussion groups, Discord threads, and CSCL website comments with inline reply actions on the `/` dashboard.
