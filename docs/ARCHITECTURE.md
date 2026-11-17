# CSCL SMM Hub — Technical Specification & Architecture (SRS & SAD / Design Doc)

- **Document Status:** Approved for Development (v2.1 — Final Edition, Scope Freeze)
- **Repository:** `cscl-smm-hub`
- **System Type:** Internal Corporate Web Dashboard (Internal Tool / B2B SaaS Architecture) hosted on a dedicated subdomain within the CSCL ecosystem.
- **Repository Mode & License:** Public Source-Available (`UNLICENSED` / All Rights Reserved — public code visibility for engineering portfolio review with legal prohibition of commercial copying and strict Zero Secrets in Code isolation).

---

## 1. Purpose & Business Goals

**CSCL SMM Hub** is a centralized pipeline for drafting, validating, scheduling, archiving history, and automatically publishing content across the CSCL esports ecosystem.

### Key Business Objectives

- **Batch Scheduling:** Enable the content manager to prepare a batch of posts for a full day or week in a single session and assign them to specific time slots in an interactive calendar.
- **Flexible Multi-Posting via Dynamic Target Cards ("+"):** Publish across 5 target channels (**Discord**, **Telegram**, **X / Twitter**, **FACEIT**, and the **CSCL Website**) with the ability to add multiple target cards via a `"+"` button (for example, targeting multiple Discord channels with distinct text and role pings in a single post) or exclude any platform with one click.
- **Categorization & Exemplar Knowledge Base:** Organize posts by business categories (`ANNOUNCEMENT`, `STANDINGS`, `FINAL`, `SPONSOR`, `GENERAL`), backfill historical posts from the operator's start date, and reuse top-performing posts (`isExemplar`) as templates and AI few-shot examples.
- **Human-Error Prevention:** Automated enforcement of character limits, media file size/format rules, and Markdown rules per target card, paired with an interactive **Live Preview** prior to publishing.
- **Fault Tolerance & Granular Retry:** External API failure isolation, strict 10-second timeouts, automated retries for transient network errors, stale lock recovery, and one-click retries for failed targets only.
- **History-Driven AI Assistant (Stage 5):** Automated draft generation from tournament/match bullet points using real category exemplars queried directly from PostgreSQL (**Few-Shot Prompting**), governed by mandatory human review (**Human-in-the-Loop**).
- **Sponsor Analytics & Unified Comment Inbox (Stage 6):** Zero-cost collection of reach and engagement metrics across platforms paired with the main CSCL website link tracker for one-click sponsor reports, plus a Unified Comment Inbox on the main dashboard.

---

## 2. Page Map & Application Routing

The UI architecture is divided into dedicated operational screens with zero functional overlap:

- **`/login` (Authentication):** Invite-only login screen supporting Discord OAuth, Steam OpenID, and Email (enforced via a strict server-side Whitelist).
- **`/` (Dashboard — Operational Summary):** Primary control center displaying `FAILED` and `PARTIAL` posts requiring immediate Retry, the upcoming 24-hour publication queue, weekly publishing metrics, and the **Unified Comment Inbox** (unanswered questions from Telegram discussion groups, Discord threads, and the CSCL website with inline reply support, plus direct thread links for X and FACEIT) with 30-second auto-refresh polling.
- **`/calendar` (Interactive Schedule Grid):** Day and week calendar view with category color-coding (Announcement, Standings, Final, Sponsor) and tournament timezone locking for batch scheduling.
- **`/posts` (Post Archive & Registry):** Complete searchable table of all posts (including backfilled historical records) using the **Compact Row List + Slide-over Sheet** UI pattern (60px compact rows with status filter tabs, one-click `"+7 days"` post cloning, manual Delta Sync button for external posts, and a slide-over preview sheet).
- **`/analytics` (Sponsor Analytics & Reports):** Aggregated metrics dashboard (views, likes, reactions + exact click counts synced from the main CSCL website tracker) filterable by the `SPONSOR` category and tournament dates for exporting sponsor reports.
- **`/posts/new` (Multi-Posting Constructor):** Primary workspace for creating posts:
  - Category selector and `"Pre-fill from category exemplar"` action.
  - Master Markdown editor, dynamic Discord timestamp generator, and Drag-and-Drop banner uploader connected directly to Cloudflare R2 (S3).
  - Dynamic target cards list (`"+"` button powered by `useFieldArray`): select platform, target channel (`channelKey`), optional `customText` override, and platform metadata (Discord role pings, link preview toggles).
  - Tabbed **Live Preview** panel powered by `useWatch` and reactive character counters per card.
- **`/posts/[id]` (Post Inspector, Logs & Editor):** Full edit form for `DRAFT` and `SCHEDULED` posts; granular delivery status monitor, raw JSONB API response viewer, and per-target Retry actions for `FAILED` targets. For already published posts (`PUBLISHED`), supports dual-mode editing via saved `externalId`: in-place native editing (`NATIVE_EDIT` enabled by default for Discord, Telegram, and CSCL Website) and opt-in delete-and-repost replacement (`REPLACE_ON_EDIT` via an unchecked-by-default `"Recreate post"` checkbox for X/Twitter and FACEIT to protect the free X API write quota and existing tweet view counts).
- **`/settings` (Integrations & Channel Routing):** Management interface for the Discord channel registry (mapping `channelKey` to Webhook or Channel ID), API token health checks, and global season snippets (active promo code `cscl`, hub and tournament URLs).

---

## 3. Target Platforms & Constraints Matrix (Platform Registry)

| Platform         | Identifier | Character Limit        | Markdown Support                           | Max Media Files | Integration Method                             |
| :--------------- | :--------- | :--------------------- | :----------------------------------------- | :-------------- | :--------------------------------------------- |
| **Discord**      | `DISCORD`  | 2000                   | Yes (Discord MD + role pings & timestamps) | 10              | Discord Webhook / Bot REST API (multi-channel) |
| **Telegram**     | `TELEGRAM` | 4096 (1024 with media) | Yes (MarkdownV2 / HTML)                    | 10 (MediaGroup) | Telegram Bot HTTP API                          |
| **X (Twitter)**  | `TWITTER`  | 280                    | No (Plain text)                            | 4               | X API v2 (OAuth 2.0, free tier write quota)    |
| **FACEIT**       | `FACEIT`   | 1000                   | Yes                                        | 1               | FACEIT Organizer / Hub API                     |
| **CSCL Website** | `SITE`     | 5000                   | Yes (Full MD)                              | 10              | Internal Protected REST / Webhook              |

---

## 4. Approved Technology Stack (2026)

Engineered around the **Zero-Bloat Production Stack** principle — enterprise reliability without unnecessary infrastructure overhead:

- **Framework:** Next.js 16 (App Router, React Server Components, Server Actions).
- **Language:** TypeScript 5+ (`strict: true`, `noUncheckedIndexedAccess: true`, zero `any` policy).
- **Database & ORM:** PostgreSQL 17 + Prisma 7 (ACID transactions, composite indexes, and JSONB storage for API payloads and platform metadata).
- **Object Media Storage:** Cloudflare R2 + `@aws-sdk/client-s3` (Presigned URL uploads providing public HTTPS media URLs across both localhost development and production).
- **Forms & Validation:** Zod (end-to-end runtime validation) + `react-hook-form` (`useFieldArray`, `useWatch`) + `@hookform/resolvers` for managing dynamic target cards.
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
├── prisma/
│   ├── schema.prisma           # Database schema and migrations
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
    │   ├── env.ts              # Zod validation for process.env
    │   └── platforms.ts        # Platform limits, categories, and Discord channel registry
    ├── modules/
    │   ├── posts/              # Server Actions, Zod schemas, CRUD, exemplar queries
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

```prisma
enum PostStatus {
  DRAFT       // Saved draft, not queued
  SCHEDULED   // Queued for future publication
  PROCESSING  // Locked by the scheduler worker (race condition protection)
  PUBLISHED   // Successfully published across all assigned target cards
  PARTIAL     // Partially published (some target cards succeeded, others FAILED)
  FAILED      // Publication failed across all assigned target cards
}

enum TargetStatus {
  PENDING     // Awaiting dispatch
  PUBLISHED   // Successfully published on the target channel
  FAILED      // External platform API error
}

enum Platform {
  DISCORD
  TELEGRAM
  TWITTER
  FACEIT
  SITE
}

enum PostCategory {
  ANNOUNCEMENT // Tournament / registration announcement
  STANDINGS    // Leaderboard / standings update
  FINAL        // Grand final results / winners
  SPONSOR      // Partner / sponsor placement
  GENERAL      // General ecosystem news
}

model Post {
  id           String       @id @default(cuid())
  title        String?      // Optional internal title for calendar readability
  category     PostCategory @default(GENERAL)
  content      String       // Master post content (Markdown)
  mediaUrls    String[]     // Public HTTPS URLs hosted on Cloudflare R2

  status       PostStatus   @default(DRAFT)
  scheduledFor DateTime?    // Scheduled publication timestamp (UTC)
  isExemplar   Boolean      @default(false) // Marks gold-standard posts for templates & AI Few-Shot

  aiPrompt     String?      // Source bullet points (if generated via AI)
  authorId     String?      // Operator ID (nullable for backfilled historical posts)

  targets      PostTarget[] // Dynamic array of target delivery cards ("+")

  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  @@index([status, scheduledFor])           // Index for 1-minute scheduler polling
  @@index([category, isExemplar, status])   // Index for fast Few-Shot exemplar lookup
}

model PostTarget {
  id           String        @id @default(cuid())
  postId       String
  post         Post          @relation(fields: [postId], references: [id], onDelete: Cascade)

  platform     Platform
  channelKey   String        @default("default") // Channel routing key (e.g., "announcements", "standings")
  customText   String?       // Target-specific text override (if different from master content)
  metadata     Json?         // JSONB: Discord role ping IDs, link preview flags, etc.

  status       TargetStatus  @default(PENDING)
  retryCount   Int           @default(0)         // Delivery attempt counter
  externalId   String?       // External message/post ID returned by the platform API
  apiResponse  Json?         // JSONB: full API response payload or error stack trace
  metrics      Json?         // JSONB: views, likes, and clicks synced from the main CSCL site tracker
  comments     PostComment[]
  publishedAt  DateTime?

  updatedAt    DateTime      @updatedAt

  @@unique([postId, platform, channelKey]) // Allows multiple cards for the same platform across different channels
  @@unique([platform, externalId])         // Idempotency for Backfill, Delta Sync, and Database Disaster Recovery
}

model PostComment {
  id                String     @id @default(cuid())
  postTargetId      String
  postTarget        PostTarget @relation(fields: [postTargetId], references: [id], onDelete: Cascade)

  externalCommentId String     // Message ID in Telegram, Discord, or CSCL Website
  authorName        String
  content           String
  isReplied         Boolean    @default(false)
  replyContent      String?

  createdAt         DateTime   @default(now())

  @@index([isReplied, createdAt])
}
```

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

### 7.
