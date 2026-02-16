# Sairex SMS — Technical Blueprint

> **Version**: 1.0.0  
> **Author**: Senior Architecture Team  
> **Date**: February 15, 2026  
> **Status**: Draft for Review

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack Recommendations](#2-tech-stack-recommendations)
3. [Database Schema (ERD)](#3-database-schema-erd)
4. [Backend Architecture](#4-backend-architecture)
5. [Frontend Modules](#5-frontend-modules)
6. [Security & Compliance](#6-security--compliance)
7. [Deployment Strategy](#7-deployment-strategy)
8. [Appendices](#8-appendices)

---

## 1. System Overview

### 1.1 Purpose

**Sairex SMS** is a multi-tenant SMS Gateway and Management System designed to provide:

| Capability | Description |
|---|---|
| **Bulk SMS** | Send thousands of messages via CSV upload, contact groups, or API — with delivery tracking and retry logic |
| **Two-Way Communication** | Receive inbound SMS via provider webhooks, route them to a real-time inbox, and enable conversational messaging |
| **API Integration** | Expose a RESTful API with API-key authentication so third-party systems (your existing School Management modules, ERPs, CRMs) can send SMS programmatically |
| **Provider Abstraction** | Unified interface over multiple SMS providers (Twilio, Vonage, Veevo Tech, local GSM/SMPP gateways) with automatic failover |

### 1.2 Context Within Existing Platform

Sairex SMS extends the existing **Sairex School Management System**. The current platform already sends fee reminders and notifications via Veevo Tech. This module **replaces the ad-hoc notification layer** with a first-class SMS gateway that any module in the system can consume.

```
┌─────────────────────────────────────────────────────────┐
│                    SAIREX PLATFORM                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Fee Mgmt │  │ Students │  │ Campuses │  ... Modules  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│       ▼              ▼              ▼                    │
│  ┌──────────────────────────────────────────┐           │
│  │          SAIREX SMS GATEWAY              │           │
│  │  ┌──────┐ ┌────────┐ ┌───────────────┐  │           │
│  │  │ REST │ │ Queue  │ │ Provider      │  │           │
│  │  │ API  │→│ Engine │→│ Abstraction   │  │           │
│  │  └──────┘ └────────┘ └───────┬───────┘  │           │
│  │                              │           │           │
│  └──────────────────────────────┼───────────┘           │
│                                 │                        │
└─────────────────────────────────┼────────────────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    ▼             ▼              ▼
              ┌──────────┐ ┌──────────┐  ┌────────────┐
              │  Twilio  │ │  Vonage  │  │ Veevo Tech │
              └──────────┘ └──────────┘  └────────────┘
```

### 1.3 Key Design Principles

1. **Tenant Isolation** — Every message, contact, and API key is scoped to an `Organization`. Leverages the existing `Organization → Campus` hierarchy.
2. **Provider Agnostic** — The system never hard-codes a provider. A `ProviderAdapter` interface allows plug-and-play addition of new gateways.
3. **Queue-First** — Every send request is enqueued before dispatch. This guarantees delivery tracking, retry semantics, and back-pressure management.
4. **Idempotent API** — Each send request accepts a client-generated `idempotencyKey` to prevent duplicate messages.
5. **Audit Everything** — Every state transition (queued → sent → delivered → failed) is logged with timestamps for compliance.

---

## 2. Tech Stack Recommendations

### 2.1 Stack Matrix

| Layer | Technology | Justification |
|---|---|---|
| **Runtime** | Node.js 22 LTS (via Next.js 16) | Already in production; excellent async I/O for high-throughput message dispatching |
| **Framework** | Next.js 16 (App Router) | Unified frontend + API routes; existing investment; server actions for dashboard |
| **Language** | TypeScript 5.x | Type safety across API contracts; already in use |
| **ORM** | Prisma 5.x | Current ORM; strong migration tooling; type-safe queries |
| **Database** | PostgreSQL 16 | Existing DB; JSONB for flexible provider metadata; excellent indexing |
| **Message Queue** | Redis 7 + BullMQ | In-memory queue with persistence; delayed jobs, retries, rate limiting, priority queues |
| **Cache** | Redis 7 (shared instance) | DLR caching, rate-limit counters, session cache |
| **Real-time** | Server-Sent Events (SSE) or Socket.io | Live inbox updates, delivery status streaming |
| **Background Jobs** | BullMQ Workers | Dedicated worker processes for message dispatch, retry, and webhook delivery |
| **SMS Providers** | Twilio, Vonage, Veevo Tech, SMPP | Pluggable adapter pattern; SMPP for local GSM gateway integration |
| **Monitoring** | Prometheus + Grafana | Queue depth, delivery rates, provider latency, error rates |
| **Frontend UI** | React 19 + Tailwind CSS 4 + shadcn/ui | Existing stack; component library for rapid dashboard development |
| **Auth** | NextAuth.js v5 (existing) | JWT sessions; role-based access; API key auth for external consumers |
| **Containerization** | Docker + Docker Compose | Reproducible environments; isolated worker scaling |
| **CI/CD** | GitHub Actions | Automated lint, test, build, deploy pipeline |

### 2.2 Architecture Diagram

```
                         ┌─────────────────────────┐
                         │     LOAD BALANCER        │
                         │    (Nginx / Vercel)      │
                         └───────────┬──────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
            ┌──────────────┐ ┌────────────┐  ┌──────────────┐
            │  Next.js App │ │  Next.js   │  │  Next.js App │
            │  Instance 1  │ │ Instance 2 │  │  Instance N  │
            │  (API + SSR) │ │ (API + SSR)│  │  (API + SSR) │
            └──────┬───────┘ └─────┬──────┘  └──────┬───────┘
                   │               │                 │
                   └───────────────┼─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌────────────┐ ┌────────────┐ ┌────────────┐
            │ PostgreSQL │ │   Redis    │ │   Redis    │
            │  Primary   │ │  (Queue)   │ │  (Cache)   │
            │  + Replica │ │  BullMQ    │ │            │
            └────────────┘ └─────┬──────┘ └────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌────────────┐ ┌──────────┐ ┌──────────┐
            │  Worker 1  │ │ Worker 2 │ │ Worker N │
            │ (Dispatch) │ │ (Retry)  │ │ (DLR)    │
            └────────────┘ └──────────┘ └──────────┘
```

### 2.3 New Dependencies

```jsonc
// Added to web/package.json
{
  "dependencies": {
    "bullmq": "^5.x",          // Message queue
    "ioredis": "^5.x",         // Redis client
    "nanoid": "^5.x",          // Short unique IDs for API keys
    "csv-parse": "^5.x",       // CSV parsing for bulk uploads
    "smpp": "^0.6.x",          // SMPP protocol for GSM gateways
    "twilio": "^5.x",          // Twilio SDK
    "@vonage/server-sdk": "^3.x", // Vonage SDK
    "libphonenumber-js": "^1.x",  // Phone number validation & formatting
    "zod": "^3.x",             // Runtime schema validation (already likely)
    "prom-client": "^15.x"     // Prometheus metrics
  }
}
```

---

## 3. Database Schema (ERD)

### 3.1 Entity Relationship Diagram

```
┌───────────────────┐       ┌────────────────────┐
│   Organization    │──────<│    SmsApiKey        │
│   (existing)      │       │                    │
└───────┬───────────┘       └────────────────────┘
        │
        │  1:N
        ▼
┌───────────────────┐       ┌────────────────────┐
│   SmsProvider     │──────<│ SmsProviderConfig   │
│   Config          │       │ (per-org settings)  │
└───────────────────┘       └────────────────────┘
        │
        │
        ▼
┌───────────────────┐       ┌────────────────────┐       ┌──────────────┐
│   SmsContact      │──────<│ SmsContactGroup    │──────<│  SmsGroup    │
│                   │       │ (junction)         │       │              │
└───────────────────┘       └────────────────────┘       └──────────────┘
        │
        │  1:N
        ▼
┌───────────────────┐       ┌────────────────────┐
│   SmsMessage      │──────<│ SmsMessageEvent    │
│   (Send/Receive)  │       │ (Status History)   │
└───────────────────┘       └────────────────────┘
        │
        │  N:1
        ▼
┌───────────────────┐       ┌────────────────────┐
│   SmsCampaign     │──────<│   SmsTemplate      │
│                   │       │                    │
└───────────────────┘       └────────────────────┘
        
┌───────────────────┐
│   SmsWebhook      │
│   (Inbound/DLR)   │
└───────────────────┘
```

### 3.2 Prisma Schema Extension

Add the following models to `prisma/schema.prisma`:

```prisma
// ============================================================
// SMS GATEWAY MODULE
// ============================================================

// --- API Keys for external integrations ---
model SmsApiKey {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name            String          // Human-readable label: "Production Key", "Test Key"
  keyPrefix       String          // First 8 chars for identification: "sk_live_"
  keyHash         String   @unique // SHA-256 hash of the full key (never store plaintext)
  scopes          String[]        // Permissions: ["sms:send", "sms:read", "contacts:write"]
  
  rateLimitPerMin Int      @default(60)
  rateLimitPerDay Int      @default(10000)
  
  isActive        Boolean  @default(true)
  lastUsedAt      DateTime?
  expiresAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  messages        SmsMessage[]

  @@index([keyHash])
  @@index([organizationId, isActive])
}

// --- SMS Provider Configuration (per organization) ---
model SmsProviderConfig {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  providerName    String       // "twilio", "vonage", "veevo", "smpp_gateway"
  displayName     String       // "Twilio Production"
  
  // Encrypted credentials stored as JSONB
  // Twilio: { accountSid, authToken, fromNumber }
  // Vonage: { apiKey, apiSecret, fromNumber }
  // Veevo:  { hash, senderId }
  // SMPP:   { host, port, systemId, password, systemType }
  credentials     Json
  
  priority        Int      @default(0)   // Lower = higher priority for failover
  isActive        Boolean  @default(true)
  isDefault       Boolean  @default(false)
  
  // Health tracking
  lastHealthCheck DateTime?
  healthStatus    String   @default("UNKNOWN") // HEALTHY, DEGRADED, DOWN, UNKNOWN
  failureCount    Int      @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  messages        SmsMessage[]

  @@unique([organizationId, providerName, displayName])
  @@index([organizationId, isActive, priority])
}

// --- Contacts ---
model SmsContact {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  phoneNumber     String       // E.164 format: "+923001234567"
  countryCode     String       @default("PK") // ISO 3166-1 alpha-2
  displayName     String?
  email           String?
  
  // Optional link back to existing Student/User
  studentId       Int?
  userId          Int?
  
  metadata        Json?        // Flexible key-value pairs for custom fields
  
  isOptedOut      Boolean  @default(false)  // DLT/GDPR: respect opt-out
  optedOutAt      DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  groups          SmsContactGroupMember[]
  messages        SmsMessage[]

  @@unique([organizationId, phoneNumber])
  @@index([organizationId, isOptedOut])
  @@index([phoneNumber])
}

// --- Contact Groups ---
model SmsGroup {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name            String
  description     String?
  color           String?      // UI label color: "#3B82F6"
  
  memberCount     Int      @default(0) // Denormalized for performance
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  members         SmsContactGroupMember[]
  campaigns       SmsCampaign[]

  @@unique([organizationId, name])
}

// --- Junction: Contact ↔ Group ---
model SmsContactGroupMember {
  id          Int        @id @default(autoincrement())
  contactId   Int
  contact     SmsContact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  groupId     Int
  group       SmsGroup   @relation(fields: [groupId], references: [id], onDelete: Cascade)
  addedAt     DateTime   @default(now())

  @@unique([contactId, groupId])
  @@index([groupId])
}

// --- Message Templates ---
model SmsTemplate {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name            String
  body            String       // Supports variables: "Dear {{name}}, your fee of {{amount}} is due on {{date}}"
  variables       String[]     // ["name", "amount", "date"]
  
  // DLT compliance (India/Pakistan regulatory)
  dltTemplateId   String?      // Registered template ID with telecom authority
  dltEntityId     String?
  isApproved      Boolean  @default(false)
  
  category        String   @default("TRANSACTIONAL") // TRANSACTIONAL, PROMOTIONAL, OTP
  language        String   @default("en")
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  campaigns       SmsCampaign[]

  @@unique([organizationId, name])
  @@index([organizationId, category])
}

// --- Campaigns (Bulk Send Jobs) ---
model SmsCampaign {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  name            String
  description     String?
  
  templateId      Int?
  template        SmsTemplate? @relation(fields: [templateId], references: [id])
  groupId         Int?
  group           SmsGroup?    @relation(fields: [groupId], references: [id])
  
  // Raw body if not using template
  messageBody     String?
  
  // Schedule
  scheduledAt     DateTime?    // Null = send immediately
  startedAt       DateTime?
  completedAt     DateTime?
  
  // Stats (denormalized for dashboard)
  totalRecipients Int      @default(0)
  sentCount       Int      @default(0)
  deliveredCount  Int      @default(0)
  failedCount     Int      @default(0)
  
  status          String   @default("DRAFT") // DRAFT, SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, PAUSED
  
  // CSV upload reference
  csvFileName     String?
  csvRowCount     Int?
  
  createdBy       String       // User email
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  messages        SmsMessage[]

  @@index([organizationId, status])
  @@index([scheduledAt])
}

// --- The Core: Message Log ---
model SmsMessage {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Direction
  direction       String       // OUTBOUND, INBOUND
  
  // Addressing
  fromNumber      String       // Sender ID or number
  toNumber        String       // E.164 recipient number
  contactId       Int?
  contact         SmsContact?  @relation(fields: [contactId], references: [id])
  
  // Content
  body            String
  encoding        String   @default("GSM-7") // GSM-7 (160 chars) or UCS-2 (70 chars)
  segments        Int      @default(1)       // Number of SMS segments
  
  // Campaign link
  campaignId      Int?
  campaign        SmsCampaign? @relation(fields: [campaignId], references: [id])
  
  // API tracking
  apiKeyId        Int?
  apiKey          SmsApiKey?   @relation(fields: [apiKeyId], references: [id])
  idempotencyKey  String?  @unique // Client-provided dedup key
  
  // Provider tracking
  providerId      Int?
  provider        SmsProviderConfig? @relation(fields: [providerId], references: [id])
  providerMsgId   String?      // External message ID from provider
  
  // Status lifecycle: QUEUED → SUBMITTED → SENT → DELIVERED / FAILED / REJECTED / EXPIRED
  status          String   @default("QUEUED")
  statusMessage   String?      // Human-readable error or info
  errorCode       String?      // Provider-specific error code
  
  // Delivery report
  deliveredAt     DateTime?
  
  // Cost tracking
  costPerSegment  Decimal? @db.Decimal(10, 6)
  totalCost       Decimal? @db.Decimal(10, 4)
  costCurrency    String   @default("PKR")
  
  // Retry
  retryCount      Int      @default(0)
  maxRetries      Int      @default(3)
  nextRetryAt     DateTime?
  
  // Timestamps
  queuedAt        DateTime @default(now())
  submittedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  events          SmsMessageEvent[]

  @@index([organizationId, direction, createdAt])
  @@index([organizationId, status])
  @@index([toNumber, createdAt])
  @@index([campaignId, status])
  @@index([providerMsgId])
  @@index([idempotencyKey])
  @@index([status, nextRetryAt])  // For retry worker
  @@index([createdAt])            // For time-range queries
}

// --- Message Event Log (Full Audit Trail) ---
model SmsMessageEvent {
  id          Int        @id @default(autoincrement())
  messageId   Int
  message     SmsMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  
  eventType   String     // QUEUED, SUBMITTED, SENT, DELIVERED, FAILED, REJECTED, EXPIRED, RETRY
  status      String     // The new status after this event
  detail      String?    // Human-readable detail
  metadata    Json?      // Raw provider callback data
  
  occurredAt  DateTime   @default(now())

  @@index([messageId, occurredAt])
  @@index([eventType, occurredAt])
}

// --- Webhooks (Outbound event notifications) ---
model SmsWebhook {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  url             String       // HTTPS endpoint
  secret          String       // HMAC signing secret for payload verification
  
  events          String[]     // ["message.sent", "message.delivered", "message.failed", "message.inbound"]
  
  isActive        Boolean  @default(true)
  
  // Health
  lastTriggeredAt DateTime?
  consecutiveFails Int     @default(0)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([organizationId, isActive])
}

// --- Webhook Delivery Log ---
model SmsWebhookDelivery {
  id          Int      @id @default(autoincrement())
  webhookId   Int
  
  eventType   String
  payload     Json
  
  // Delivery attempt
  httpStatus  Int?
  responseBody String?
  latencyMs   Int?
  
  attempt     Int      @default(1)
  success     Boolean  @default(false)
  
  createdAt   DateTime @default(now())

  @@index([webhookId, createdAt])
  @@index([success, createdAt])
}
```

### 3.3 Required Relation Updates to Existing Organization Model

```prisma
model Organization {
  // ... existing fields ...
  
  // SMS Gateway relations (add these)
  smsApiKeys        SmsApiKey[]
  smsProviders      SmsProviderConfig[]
  smsContacts       SmsContact[]
  smsGroups         SmsGroup[]
  smsTemplates      SmsTemplate[]
  smsCampaigns      SmsCampaign[]
  smsMessages       SmsMessage[]
  smsWebhooks       SmsWebhook[]
}
```

### 3.4 Index Strategy

| Index | Purpose | Expected Query |
|---|---|---|
| `SmsMessage(organizationId, direction, createdAt)` | Dashboard: "Show me outbound messages this week" | Time-range + direction filter |
| `SmsMessage(organizationId, status)` | Queue monitor: "How many messages are stuck in QUEUED?" | Status aggregation |
| `SmsMessage(status, nextRetryAt)` | Retry worker: "Find messages due for retry" | Background job polling |
| `SmsMessage(providerMsgId)` | DLR callback: "Update status for provider message X" | Webhook handler lookup |
| `SmsMessage(campaignId, status)` | Campaign stats: "How many delivered in campaign Y?" | Campaign detail page |
| `SmsContact(organizationId, phoneNumber)` UNIQUE | Prevent duplicate contacts per org | Upsert on import |
| `SmsApiKey(keyHash)` UNIQUE | API auth: hash incoming key, lookup | Every API request |

---

## 4. Backend Architecture

### 4.1 Directory Structure

```
web/
├── app/
│   └── api/
│       └── sms/
│           ├── send/
│           │   └── route.ts              # POST /api/sms/send
│           ├── send-bulk/
│           │   └── route.ts              # POST /api/sms/send-bulk
│           ├── status/
│           │   └── [messageId]/
│           │       └── route.ts          # GET /api/sms/status/:messageId
│           ├── messages/
│           │   └── route.ts              # GET /api/sms/messages (list/search)
│           ├── inbox/
│           │   └── route.ts              # GET /api/sms/inbox (inbound messages)
│           ├── receive/
│           │   └── route.ts              # POST /api/sms/receive (provider webhook)
│           ├── dlr/
│           │   └── route.ts              # POST /api/sms/dlr (delivery reports)
│           ├── contacts/
│           │   ├── route.ts              # GET, POST /api/sms/contacts
│           │   ├── [contactId]/
│           │   │   └── route.ts          # GET, PUT, DELETE
│           │   └── import/
│           │       └── route.ts          # POST (CSV import)
│           ├── groups/
│           │   ├── route.ts              # GET, POST /api/sms/groups
│           │   └── [groupId]/
│           │       ├── route.ts          # GET, PUT, DELETE
│           │       └── members/
│           │           └── route.ts      # GET, POST, DELETE members
│           ├── campaigns/
│           │   ├── route.ts              # GET, POST /api/sms/campaigns
│           │   └── [campaignId]/
│           │       ├── route.ts          # GET, PUT
│           │       ├── start/
│           │       │   └── route.ts      # POST (trigger send)
│           │       ├── pause/
│           │       │   └── route.ts      # POST
│           │       └── stats/
│           │           └── route.ts      # GET (real-time stats)
│           ├── templates/
│           │   ├── route.ts              # GET, POST
│           │   └── [templateId]/
│           │       └── route.ts          # GET, PUT, DELETE
│           ├── providers/
│           │   ├── route.ts              # GET, POST (admin)
│           │   └── [providerId]/
│           │       ├── route.ts          # GET, PUT, DELETE
│           │       └── test/
│           │           └── route.ts      # POST (send test message)
│           ├── api-keys/
│           │   ├── route.ts              # GET, POST
│           │   └── [keyId]/
│           │       └── route.ts          # DELETE, PUT (revoke/rotate)
│           ├── webhooks/
│           │   ├── route.ts              # GET, POST
│           │   └── [webhookId]/
│           │       └── route.ts          # GET, PUT, DELETE
│           └── analytics/
│               └── route.ts              # GET (dashboard data)
├── lib/
│   └── sms/
│       ├── queue.ts                      # BullMQ queue definitions
│       ├── workers/
│       │   ├── dispatch-worker.ts        # Picks messages off queue, sends via provider
│       │   ├── retry-worker.ts           # Retries failed messages
│       │   ├── campaign-worker.ts        # Processes bulk campaign sends
│       │   ├── dlr-worker.ts             # Processes delivery report updates
│       │   └── webhook-worker.ts         # Fires outbound webhooks
│       ├── providers/
│       │   ├── index.ts                  # Provider registry & factory
│       │   ├── base-provider.ts          # Abstract ProviderAdapter interface
│       │   ├── twilio-provider.ts        # Twilio implementation
│       │   ├── vonage-provider.ts        # Vonage implementation
│       │   ├── veevo-provider.ts         # Veevo Tech implementation
│       │   └── smpp-provider.ts          # SMPP/GSM gateway implementation
│       ├── phone-utils.ts                # E.164 formatting, validation
│       ├── template-engine.ts            # Variable interpolation for templates
│       ├── rate-limiter.ts               # Redis-based sliding window rate limiter
│       ├── api-key-auth.ts               # API key hashing, validation middleware
│       └── metrics.ts                    # Prometheus counters/histograms
```

### 4.2 API Documentation

#### 4.2.1 Authentication

All SMS API endpoints support **two authentication methods**:

| Method | Use Case | Header |
|---|---|---|
| **Session (JWT)** | Dashboard / admin UI | `Cookie: next-auth.session-token=...` |
| **API Key** | External integrations | `Authorization: Bearer sk_live_abc123...` |

#### 4.2.2 Core Endpoints

---

##### `POST /api/sms/send` — Send a Single Message

**Request:**
```json
{
  "to": "+923001234567",
  "body": "Your fee of PKR 5,000 is due on March 1st.",
  "from": "+19876543210",          // Optional: override sender ID
  "provider": "twilio",             // Optional: force specific provider
  "idempotencyKey": "fee-rem-123", // Optional: prevent duplicates
  "callbackUrl": "https://...",    // Optional: per-message DLR webhook
  "metadata": {                    // Optional: stored with message
    "studentId": 42,
    "challanNo": "CH-2026-0001"
  }
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "messageId": 98765,
    "status": "QUEUED",
    "to": "+923001234567",
    "segments": 1,
    "estimatedCost": "0.50",
    "queuedAt": "2026-02-15T10:30:00Z"
  }
}
```

**Errors:**
| Code | Meaning |
|---|---|
| `400` | Invalid phone number, empty body, body too long |
| `401` | Missing/invalid API key or session |
| `402` | Insufficient credits/balance |
| `409` | Duplicate idempotencyKey |
| `422` | Contact opted out (DLT compliance) |
| `429` | Rate limit exceeded |

---

##### `POST /api/sms/send-bulk` — Bulk Send

**Request:**
```json
{
  "campaignId": 15,                 // Use existing campaign
  // OR inline:
  "recipients": [
    { "to": "+923001234567", "variables": { "name": "Ali", "amount": "5000" } },
    { "to": "+923009876543", "variables": { "name": "Sara", "amount": "7500" } }
  ],
  "templateId": 3,                  // Or "body": "Dear {{name}}, ..."
  "scheduledAt": "2026-03-01T09:00:00Z"  // Optional: schedule for later
}
```

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": {
    "campaignId": 15,
    "totalRecipients": 2,
    "status": "SCHEDULED",
    "scheduledAt": "2026-03-01T09:00:00Z"
  }
}
```

---

##### `GET /api/sms/status/:messageId` — Check Message Status

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messageId": 98765,
    "status": "DELIVERED",
    "to": "+923001234567",
    "body": "Your fee of PKR 5,000 is due...",
    "segments": 1,
    "provider": "twilio",
    "providerMsgId": "SM1234567890",
    "timeline": [
      { "event": "QUEUED",    "at": "2026-02-15T10:30:00Z" },
      { "event": "SUBMITTED", "at": "2026-02-15T10:30:01Z" },
      { "event": "SENT",      "at": "2026-02-15T10:30:02Z" },
      { "event": "DELIVERED", "at": "2026-02-15T10:30:05Z" }
    ],
    "cost": { "amount": "0.50", "currency": "PKR" }
  }
}
```

---

##### `POST /api/sms/receive` — Inbound Message Webhook (Provider → Sairex)

This endpoint is called by SMS providers when an inbound message arrives.

**Twilio format (auto-detected):**
```
POST /api/sms/receive?provider=twilio
Content-Type: application/x-www-form-urlencoded

From=+923001234567&To=+19876543210&Body=Yes+I+confirm&MessageSid=SM123
```

**Processing:**
1. Validate provider signature (Twilio signature validation / Vonage JWT)
2. Normalize to internal format
3. Store as `SmsMessage` with `direction: "INBOUND"`
4. Auto-link to `SmsContact` if phone number exists
5. Fire `message.inbound` webhook to registered endpoints
6. Push to SSE/Socket for live inbox

**Response (200):**
```xml
<!-- Twilio TwiML response (optional auto-reply) -->
<Response>
  <Message>Thank you, we received your message.</Message>
</Response>
```

---

##### `GET /api/sms/messages` — List Messages (with Filtering)

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `direction` | `OUTBOUND \| INBOUND` | Filter by direction |
| `status` | `string` | Filter by status |
| `from` | `ISO date` | Start date |
| `to` | `ISO date` | End date |
| `phone` | `string` | Filter by phone number |
| `campaignId` | `int` | Filter by campaign |
| `page` | `int` | Pagination (default: 1) |
| `limit` | `int` | Page size (default: 50, max: 200) |

---

##### `GET /api/sms/analytics` — Dashboard Analytics

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "last_30_days",
    "summary": {
      "totalSent": 15230,
      "totalDelivered": 14876,
      "totalFailed": 354,
      "deliveryRate": 97.67,
      "totalInbound": 892,
      "totalCost": "7615.00",
      "costCurrency": "PKR"
    },
    "dailyBreakdown": [
      { "date": "2026-02-15", "sent": 520, "delivered": 510, "failed": 10 },
      { "date": "2026-02-14", "sent": 480, "delivered": 470, "failed": 10 }
    ],
    "providerBreakdown": [
      { "provider": "twilio", "sent": 10000, "deliveryRate": 98.2 },
      { "provider": "veevo",  "sent": 5230,  "deliveryRate": 96.5 }
    ],
    "topCampaigns": [
      { "id": 15, "name": "March Fee Reminder", "sent": 3200, "deliveryRate": 99.1 }
    ]
  }
}
```

### 4.3 Message Queue Architecture

#### 4.3.1 Queue Topology (BullMQ)

```
┌─────────────────────────────────────────────────────────┐
│                    REDIS (BullMQ)                        │
│                                                         │
│  ┌─────────────────┐  Priority Levels:                  │
│  │  sms:dispatch   │  • 1 = OTP (real-time)             │
│  │  (main queue)   │  • 5 = Transactional               │
│  │                 │  • 10 = Campaign/Bulk               │
│  └────────┬────────┘                                    │
│           │                                             │
│  ┌────────┴────────┐                                    │
│  │   sms:retry     │  Delayed queue for failed msgs     │
│  └────────┬────────┘                                    │
│           │                                             │
│  ┌────────┴────────┐                                    │
│  │   sms:dlr       │  Delivery report processing        │
│  └────────┬────────┘                                    │
│           │                                             │
│  ┌────────┴────────┐                                    │
│  │  sms:webhook    │  Outbound webhook delivery         │
│  └────────┬────────┘                                    │
│           │                                             │
│  ┌────────┴────────┐                                    │
│  │  sms:campaign   │  Campaign orchestration            │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

#### 4.3.2 Dispatch Worker Logic

```typescript
// Pseudocode for dispatch-worker.ts

async function processMessage(job: Job<SmsDispatchPayload>) {
  const { messageId, organizationId } = job.data;

  // 1. Load message from DB
  const message = await prisma.smsMessage.findUnique({ where: { id: messageId } });
  if (!message || message.status !== "QUEUED") return; // Already processed

  // 2. Check opt-out
  if (message.contactId) {
    const contact = await prisma.smsContact.findUnique({ where: { id: message.contactId } });
    if (contact?.isOptedOut) {
      await updateStatus(messageId, "REJECTED", "Contact opted out");
      return;
    }
  }

  // 3. Select provider (failover chain)
  const providers = await getActiveProviders(organizationId);
  
  for (const provider of providers) {
    try {
      // 4. Apply rate limiting (per-provider, per-org)
      await rateLimiter.acquire(`provider:${provider.id}:${organizationId}`);
      
      // 5. Send via provider adapter
      const adapter = ProviderFactory.create(provider);
      const result = await adapter.send({
        to: message.toNumber,
        from: message.fromNumber,
        body: message.body,
      });
      
      // 6. Record success
      await prisma.smsMessage.update({
        where: { id: messageId },
        data: {
          status: "SUBMITTED",
          providerId: provider.id,
          providerMsgId: result.externalId,
          submittedAt: new Date(),
        },
      });
      
      await logEvent(messageId, "SUBMITTED", `Sent via ${provider.providerName}`);
      return; // Success — exit loop
      
    } catch (error) {
      // 7. Provider failed — try next
      await logEvent(messageId, "PROVIDER_ERROR", error.message, { provider: provider.providerName });
      await incrementProviderFailure(provider.id);
      continue; // Try next provider in failover chain
    }
  }

  // 8. All providers failed — schedule retry
  const retryCount = message.retryCount + 1;
  if (retryCount <= message.maxRetries) {
    const delay = calculateExponentialBackoff(retryCount); // 30s, 120s, 480s
    await prisma.smsMessage.update({
      where: { id: messageId },
      data: {
        retryCount,
        nextRetryAt: new Date(Date.now() + delay),
        status: "QUEUED",
      },
    });
    await retryQueue.add("retry", { messageId }, { delay });
    await logEvent(messageId, "RETRY", `Retry ${retryCount}/${message.maxRetries} in ${delay}ms`);
  } else {
    await updateStatus(messageId, "FAILED", "All providers exhausted after max retries");
  }
}
```

#### 4.3.3 Retry & Backoff Strategy

| Retry | Delay | Cumulative |
|---|---|---|
| 1st | 30 seconds | 30s |
| 2nd | 2 minutes | 2m 30s |
| 3rd | 8 minutes | 10m 30s |

Formula: `delay = 30_000 * Math.pow(4, retryCount - 1)`

#### 4.3.4 Provider Failover Logic

```
Provider Selection Algorithm:
1. Load all ACTIVE providers for the organization, ordered by `priority` ASC
2. Filter out providers with healthStatus = "DOWN"
3. For each provider (in priority order):
   a. Check rate limit (sliding window in Redis)
   b. Attempt send
   c. On success → return
   d. On failure → increment failureCount, try next
4. If all fail → enqueue for retry with exponential backoff

Health Check (runs every 60s via cron):
- If failureCount > 5 in last 5 minutes → mark DEGRADED
- If failureCount > 20 in last 5 minutes → mark DOWN
- Successful send → reset failureCount, mark HEALTHY
```

#### 4.3.5 Provider Adapter Interface

```typescript
// lib/sms/providers/base-provider.ts

export interface SendRequest {
  to: string;          // E.164 format
  from: string;        // Sender ID or number
  body: string;        // Message content
}

export interface SendResult {
  externalId: string;  // Provider's message ID
  status: string;      // Provider-specific initial status
  segments: number;    // Number of SMS parts
  cost?: number;       // Cost if available immediately
}

export interface ProviderAdapter {
  readonly name: string;
  
  send(request: SendRequest): Promise<SendResult>;
  
  getDeliveryStatus(externalId: string): Promise<string>;
  
  validateSignature(payload: any, signature: string): boolean;
  
  parseInbound(payload: any): InboundMessage;
  
  healthCheck(): Promise<boolean>;
}
```

### 4.4 Throttling & Rate Limiting

```
Rate Limit Architecture (Redis Sliding Window):

┌──────────────────────────────────────────────────────────┐
│                    RATE LIMIT LAYERS                      │
│                                                          │
│  Layer 1: API Key Level                                  │
│  ├── Per-minute: 60 req/min (configurable per key)       │
│  └── Per-day:    10,000 req/day                          │
│                                                          │
│  Layer 2: Organization Level                             │
│  ├── Per-minute: 300 req/min                             │
│  └── Per-day:    50,000 req/day                          │
│                                                          │
│  Layer 3: Provider Level                                 │
│  ├── Twilio:  100 msg/sec (API limit)                    │
│  ├── Vonage:  30 msg/sec                                 │
│  └── Veevo:   10 msg/sec                                │
│                                                          │
│  Layer 4: Global System                                  │
│  └── 500 msg/sec across all orgs                         │
│                                                          │
│  Algorithm: Redis ZRANGEBYSCORE sliding window            │
│  Key:       ratelimit:{scope}:{id}:{window}              │
│  Members:   request timestamps with auto-expire          │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Frontend Modules

### 5.1 Navigation Structure

```
SMS Gateway (sidebar section)
├── 📊 Dashboard        → /admin/sms
├── 💬 Inbox            → /admin/sms/inbox
├── 📤 Send Message     → /admin/sms/send
├── 📋 Campaigns        → /admin/sms/campaigns
│   ├── New Campaign    → /admin/sms/campaigns/new
│   └── Campaign Detail → /admin/sms/campaigns/[id]
├── 👥 Contacts         → /admin/sms/contacts
│   ├── Import          → /admin/sms/contacts/import
│   └── Groups          → /admin/sms/contacts/groups
├── 📝 Templates        → /admin/sms/templates
├── ⚙️ Settings         → /admin/sms/settings
│   ├── Providers       → /admin/sms/settings/providers
│   ├── API Keys        → /admin/sms/settings/api-keys
│   └── Webhooks        → /admin/sms/settings/webhooks
└── 📈 Reports          → /admin/sms/reports
```

### 5.2 Module Breakdown

#### 5.2.1 Dashboard (`/admin/sms`)

The primary analytics view showing real-time SMS performance.

**Components:**

| Component | Description |
|---|---|
| **KPI Cards** | Total Sent (today/week/month), Delivery Rate %, Failed Count, Total Cost |
| **Delivery Trend Chart** | Line chart showing sent vs delivered vs failed over configurable time range (7d / 30d / 90d) |
| **Provider Health** | Status badges for each configured provider (Healthy / Degraded / Down) with last-check timestamp |
| **Queue Monitor** | Real-time count of messages in each queue state (Queued → Submitted → Sent) |
| **Recent Activity** | Live feed of the last 20 messages with status pills |
| **Top Campaigns** | Leaderboard of active campaigns with progress bars |

**Data Source:** `GET /api/sms/analytics`

**Wireframe:**
```
┌──────────────────────────────────────────────────────────┐
│  SMS Dashboard                          [Last 30 Days ▼] │
├──────────┬───────────┬───────────┬───────────────────────┤
│  Sent    │ Delivered │  Failed   │   Cost                │
│  15,230  │  14,876   │    354    │   PKR 7,615           │
│  ↑12%    │  97.7%    │   2.3%    │   ↓5%                 │
├──────────┴───────────┴───────────┴───────────────────────┤
│                                                          │
│  ████████████████████████████████████  Delivery Trend    │
│  ██████████████████████████████████                      │
│  ████████████████████████████                            │
│  ──────────────────────────────────  (line chart)        │
│                                                          │
├────────────────────────────┬─────────────────────────────┤
│  Provider Health           │  Queue Status               │
│  ● Twilio     HEALTHY     │  Queued:     23              │
│  ● Vonage     HEALTHY     │  Submitted:  12              │
│  ● Veevo      DEGRADED    │  Processing: 5               │
│                            │  Failed:     0               │
├────────────────────────────┴─────────────────────────────┤
│  Recent Messages                                         │
│  +923001234567  "Your fee..."  ✅ DELIVERED  2m ago      │
│  +923009876543  "Dear Sara..." ⏳ SUBMITTED  3m ago      │
│  +923007654321  "Reminder:..." ❌ FAILED     5m ago      │
└──────────────────────────────────────────────────────────┘
```

#### 5.2.2 Campaign Manager (`/admin/sms/campaigns`)

Full lifecycle management for bulk SMS campaigns.

**Features:**

| Feature | Description |
|---|---|
| **Create Campaign** | Name, select template or write body, choose group or upload CSV, set schedule |
| **CSV Upload** | Drag-and-drop CSV with column mapping UI (phone, name, custom variables). Preview first 10 rows before confirming |
| **Campaign Detail** | Real-time progress bar, delivery stats, per-recipient status table with search |
| **Pause / Resume** | Pause mid-campaign, resume sending where it left off |
| **A/B Testing** | Optional: split audience into variants with different message bodies |

**CSV Upload Flow:**
```
┌──────────────────────────────────────────────────────────┐
│  Step 1: Upload                                          │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                         │
│  │  📎 Drop CSV here or click │                         │
│  │     to browse               │                         │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                         │
│                                                          │
│  Step 2: Map Columns                                     │
│  CSV Column        →    Field                            │
│  ┌─────────────┐       ┌──────────────┐                  │
│  │ mobile_num  │  →    │ Phone Number │                  │
│  │ student_name│  →    │ {{name}}     │                  │
│  │ fee_amount  │  →    │ {{amount}}   │                  │
│  └─────────────┘       └──────────────┘                  │
│                                                          │
│  Step 3: Preview (first 10 rows)                         │
│  +923001234567 → "Dear Ali, your fee of PKR 5000..."    │
│  +923009876543 → "Dear Sara, your fee of PKR 7500..."   │
│                                                          │
│  Step 4: Confirm & Schedule                              │
│  [Send Now]  [Schedule for Later 📅]  [Save as Draft]    │
└──────────────────────────────────────────────────────────┘
```

#### 5.2.3 Live Inbox (`/admin/sms/inbox`)

Two-way conversational SMS interface.

**Layout:**
```
┌─────────────────┬────────────────────────────────────────┐
│  Conversations  │  Chat View                             │
│  🔍 Search...   │                                        │
│                 │  +923001234567 (Ali Khan)               │
│  ● Ali Khan    │  ──────────────────────────             │
│    "Yes I con..│                                         │
│    2m ago      │  ◄ Your fee of PKR 5,000 is due.  10:30│
│                │                                         │
│  ● Sara Ahmed  │  ► Yes I confirm payment.         10:32│
│    "When is t..│                                         │
│    15m ago     │  ◄ Thank you! Payment received.   10:33│
│                │                                         │
│  ● Parent #45  │                                         │
│    "Please re..│                                         │
│    1h ago      │  ┌──────────────────────────────┐       │
│                │  │ Type a reply...         [Send]│       │
│                │  └──────────────────────────────┘       │
├─────────────────┴────────────────────────────────────────┤
│  ⚙ Auto-reply rules  │  📋 Quick replies  │  🏷 Labels  │
└──────────────────────────────────────────────────────────┘
```

**Real-time Features:**
- SSE connection for new inbound messages (toast notification + conversation update)
- Typing indicator when composing reply
- Unread badge count on sidebar
- Contact auto-linking (matches phone to existing `SmsContact`)

#### 5.2.4 Settings Pages

**Provider Configuration (`/admin/sms/settings/providers`):**
- Add/edit/remove SMS providers
- Credential form per provider type (Twilio fields differ from SMPP fields)
- "Send Test Message" button per provider
- Priority drag-and-drop reordering for failover chain
- Health status indicator with failure history

**API Key Management (`/admin/sms/settings/api-keys`):**
- Generate new key (displayed ONCE, then only prefix shown)
- Set scopes via checkbox (sms:send, sms:read, contacts:read, contacts:write)
- Configure per-key rate limits
- Revoke / rotate keys
- Last-used timestamp and request count

**Webhook Management (`/admin/sms/settings/webhooks`):**
- Register webhook URLs with event type selection
- Auto-generated signing secret with copy button
- Delivery log with status codes and retry attempts
- "Test Webhook" button that sends a sample payload

---

## 6. Security & Compliance

### 6.1 Authentication & Authorization Matrix

| Endpoint Category | Session (JWT) | API Key | Role Restriction |
|---|---|---|---|
| Dashboard / Analytics | Yes | No | ORG_ADMIN+ |
| Send Message | Yes | Yes | ORG_ADMIN+ or valid API key |
| Inbox / Messages | Yes | Yes (read scope) | ORG_ADMIN+ |
| Contacts CRUD | Yes | Yes (contacts scope) | ORG_ADMIN+ |
| Campaigns | Yes | No | ORG_ADMIN+ |
| Provider Config | Yes | No | ORG_ADMIN only |
| API Key Management | Yes | No | ORG_ADMIN only |
| Webhook Config | Yes | No | ORG_ADMIN only |
| Receive (inbound) | Provider signature | N/A | Public (validated by signature) |
| DLR Callback | Provider signature | N/A | Public (validated by signature) |

### 6.2 API Key Security

```
Key Generation Flow:
1. Generate 32-byte random key → Base62 encode → "sk_live_a1B2c3D4..."
2. Store SHA-256(key) in DB (never store plaintext)
3. Return full key to user ONCE in the creation response
4. On each API request:
   a. Extract key from Authorization header
   b. Compute SHA-256(key)
   c. Lookup keyHash in DB (indexed)
   d. Validate: isActive, not expired, scopes include required scope
   e. Update lastUsedAt (debounced, every 60s)
```

### 6.3 Rate Limiting Implementation

```typescript
// Redis Sliding Window Rate Limiter

async function checkRateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - (windowSec * 1000);
  const redisKey = `ratelimit:${key}`;
  
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(redisKey, 0, windowStart);     // Remove expired entries
  pipeline.zadd(redisKey, now, `${now}:${nanoid()}`);      // Add current request
  pipeline.zcard(redisKey);                                  // Count requests in window
  pipeline.expire(redisKey, windowSec);                      // Auto-cleanup
  
  const results = await pipeline.exec();
  const requestCount = results[2][1] as number;
  
  return requestCount <= limit;
}
```

**Rate Limit Headers (returned on every response):**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1739612400
Retry-After: 30  (only on 429 responses)
```

### 6.4 DLT Compliance (Pakistan / India)

DLT (Distributed Ledger Technology) registration is required for commercial SMS in Pakistan and India.

| Requirement | Implementation |
|---|---|
| **Entity Registration** | Store `dltEntityId` per organization in `SmsProviderConfig.credentials` |
| **Template Registration** | `SmsTemplate.dltTemplateId` — only templates with `isApproved: true` can be used for transactional SMS |
| **Consent Management** | `SmsContact.isOptedOut` flag; dispatch worker checks before sending |
| **Header/Sender ID** | Registered sender IDs stored per provider; validated on send |

### 6.5 GDPR / Data Privacy

| Requirement | Implementation |
|---|---|
| **Right to Erasure** | `DELETE /api/sms/contacts/:id` — anonymizes messages (replaces phone with hash), deletes contact |
| **Consent Tracking** | `SmsContact.isOptedOut` + `optedOutAt` timestamp |
| **Data Retention** | Configurable retention policy; cron job purges messages older than N days (default: 365) |
| **Audit Log** | `SmsMessageEvent` table tracks every status change with timestamp |
| **Encryption at Rest** | Provider credentials stored as encrypted JSON; database-level encryption recommended |
| **Data Export** | `GET /api/sms/contacts/export` — CSV export of all contacts for an org |

### 6.6 Input Validation

All endpoints use **Zod** schemas for runtime validation:

```typescript
const sendMessageSchema = z.object({
  to: z.string().regex(/^\+[1-9]\d{6,14}$/, "Must be E.164 format"),
  body: z.string().min(1).max(1600),  // Max 10 segments
  from: z.string().optional(),
  provider: z.string().optional(),
  idempotencyKey: z.string().max(128).optional(),
  callbackUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});
```

### 6.7 Security Checklist

- [x] API key hashing (SHA-256, never store plaintext)
- [x] Provider webhook signature validation (HMAC / Twilio signature)
- [x] Outbound webhook signing (HMAC-SHA256 with per-webhook secret)
- [x] Rate limiting at 4 layers (API key, org, provider, global)
- [x] Tenant isolation on every query (enforced by `auth-guard.ts` + `tenant.ts`)
- [x] SQL injection prevention (Prisma parameterized queries)
- [x] CSRF protection (API key endpoints are stateless; session endpoints use NextAuth CSRF)
- [x] Phone number validation and E.164 normalization
- [x] Message body sanitization (strip control characters)
- [x] Idempotency keys to prevent duplicate sends
- [x] Secrets never logged (redact credentials in error handlers)

---

## 7. Deployment Strategy

### 7.1 Docker Architecture

```
docker-compose.yml
├── web          → Next.js app (API + SSR + Dashboard)
├── worker       → BullMQ workers (dispatch, retry, DLR, webhook, campaign)
├── postgres     → PostgreSQL 16
├── redis        → Redis 7 (queue + cache)
├── prometheus   → Metrics collection
└── grafana      → Monitoring dashboards
```

### 7.2 Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  # --- Database ---
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: sairex_sms
      POSTGRES_USER: sairex
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sairex"]
      interval: 10s
      timeout: 5s
      retries: 5

  # --- Message Queue & Cache ---
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # --- Next.js Application ---
  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://sairex:${DB_PASSWORD}@postgres:5432/sairex_sms
      REDIS_URL: redis://redis:6379
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  # --- Background Workers ---
  worker:
    build:
      context: ./web
      dockerfile: Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://sairex:${DB_PASSWORD}@postgres:5432/sairex_sms
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      replicas: 2  # Scale workers independently

  # --- Monitoring ---
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafanadata:/var/lib/grafana

volumes:
  pgdata:
  redisdata:
  grafanadata:
```

### 7.3 Dockerfile (Next.js App)

```dockerfile
# web/Dockerfile
FROM node:22-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

### 7.4 Worker Dockerfile

```dockerfile
# web/Dockerfile.worker
FROM node:22-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

# Workers run as a long-lived Node process
CMD ["node", "--import", "tsx", "lib/sms/workers/index.ts"]
```

### 7.5 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # --- Lint & Type Check ---
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npx prisma generate
        working-directory: web
      - run: npm run lint
        working-directory: web
      - run: npx tsc --noEmit
        working-directory: web

  # --- Unit & Integration Tests ---
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: sairex_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npx prisma migrate deploy
        working-directory: web
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/sairex_test
      - run: npm test
        working-directory: web
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/sairex_test
          REDIS_URL: redis://localhost:6379

  # --- Build & Push Docker Image ---
  build:
    needs: [quality, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./web
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/web:latest
            ghcr.io/${{ github.repository }}/web:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - uses: docker/build-push-action@v5
        with:
          context: ./web
          file: ./web/Dockerfile.worker
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/worker:latest
            ghcr.io/${{ github.repository }}/worker:${{ github.sha }}

  # --- Deploy ---
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /opt/sairex-sms
            docker compose pull
            docker compose up -d --remove-orphans
            docker compose exec web npx prisma migrate deploy
```

### 7.6 Environment Variables

```bash
# .env.example (create this file)

# --- Database ---
DATABASE_URL=postgresql://sairex:password@localhost:5432/sairex_sms
DB_PASSWORD=your_secure_password

# --- Redis ---
REDIS_URL=redis://localhost:6379

# --- Auth ---
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# --- SMS Providers (configure via admin UI, these are fallback/defaults) ---
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_FROM_NUMBER=

VEEVO_HASH=
VEEVO_SENDER=

# --- SMPP Gateway ---
SMPP_HOST=
SMPP_PORT=2775
SMPP_SYSTEM_ID=
SMPP_PASSWORD=

# --- Monitoring ---
GRAFANA_PASSWORD=admin

# --- Email (existing) ---
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=Sairex SMS
```

---

## 8. Appendices

### 8.1 Message Status State Machine

```
                    ┌──────────┐
                    │  QUEUED   │ ◄── API Request / Campaign Worker
                    └────┬─────┘
                         │
                    ┌────▼─────┐
               ┌────│SUBMITTED │ ◄── Provider accepted
               │    └────┬─────┘
               │         │
               │    ┌────▼─────┐
               │    │   SENT   │ ◄── Provider confirmed send
               │    └────┬─────┘
               │         │
               │    ┌────▼──────┐
               │    │ DELIVERED │ ◄── DLR callback received
               │    └───────────┘
               │
               │    ┌───────────┐
               ├───►│  FAILED   │ ◄── All retries exhausted
               │    └───────────┘
               │
               │    ┌───────────┐
               ├───►│ REJECTED  │ ◄── Opt-out / DLT block / Invalid number
               │    └───────────┘
               │
               │    ┌───────────┐
               └───►│  EXPIRED  │ ◄── TTL exceeded without DLR
                    └───────────┘
```

### 8.2 Throughput Estimates

| Tier | Messages/Day | Concurrent Workers | Redis Memory | DB Growth/Month |
|---|---|---|---|---|
| Starter | 1,000 | 1 | 50 MB | ~50 MB |
| Growth | 50,000 | 2 | 200 MB | ~2.5 GB |
| Enterprise | 500,000 | 5+ | 1 GB | ~25 GB |

### 8.3 Monitoring Metrics (Prometheus)

| Metric | Type | Description |
|---|---|---|
| `sms_messages_total` | Counter | Total messages by status, direction, provider |
| `sms_queue_depth` | Gauge | Current queue depth per queue name |
| `sms_dispatch_duration_seconds` | Histogram | Time to dispatch a message (provider latency) |
| `sms_delivery_rate` | Gauge | Rolling delivery success percentage |
| `sms_provider_health` | Gauge | Provider health status (1=healthy, 0=down) |
| `sms_api_requests_total` | Counter | API requests by endpoint, method, status code |
| `sms_rate_limit_hits_total` | Counter | Rate limit rejections by scope |

### 8.4 Glossary

| Term | Definition |
|---|---|
| **DLR** | Delivery Report — callback from provider confirming message delivery status |
| **DLT** | Distributed Ledger Technology — regulatory framework for SMS in South Asia |
| **E.164** | International phone number format: `+[country][number]` (e.g., `+923001234567`) |
| **GSM-7** | Standard SMS encoding, 160 characters per segment |
| **UCS-2** | Unicode SMS encoding, 70 characters per segment |
| **SMPP** | Short Message Peer-to-Peer — protocol for high-volume SMS via direct carrier connection |
| **Segment** | One SMS part; long messages are split into multiple segments |
| **Sender ID** | The "from" label/number displayed on recipient's phone |
| **Idempotency Key** | Client-generated unique ID to prevent duplicate message sends |

---

> **Next Steps:** Once this blueprint is approved, provide the command `INIT` and I will generate:
> 1. Terminal commands to scaffold the full file structure
> 2. The complete Prisma migration SQL
> 3. Starter code for the provider adapter pattern and queue setup

---

*Document generated for Sairex SMS v1.0 — February 2026*
