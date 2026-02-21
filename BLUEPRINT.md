# SAIREX SMS — Full Project Blueprint (AI Reference)

> **Last updated:** 2026-02-20
> **Purpose:** Canonical reference for any AI assistant continuing development on this project.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Database Schema](#4-database-schema)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Multi-Tenant Architecture](#6-multi-tenant-architecture)
7. [Onboarding Flow](#7-onboarding-flow)
8. [API Routes Reference](#8-api-routes-reference)
9. [Background Job System](#9-background-job-system)
10. [PDF Generation](#10-pdf-generation)
11. [UI Component System](#11-ui-component-system)
12. [Validation Layer](#12-validation-layer)
13. [Admin Pages](#13-admin-pages)
14. [Navigation & Sidebar](#14-navigation--sidebar)
15. [External Services](#15-external-services)
16. [Environment Variables](#16-environment-variables)
17. [Scripts & Tooling](#17-scripts--tooling)
18. [Known Issues & Technical Debt](#18-known-issues--technical-debt)
19. [Coding Standards (Enforced Rules)](#19-coding-standards-enforced-rules)

---

## 1. Project Overview

**SAIREX SMS** (Smart Management System) is an enterprise multi-tenant SaaS ERP for educational institutions (schools, colleges, academies, universities). It handles:

- **Organization onboarding** — multi-step registration with identity, legal, address, branding, and OTP verification
- **Multi-campus management** — organizations can have regional offices and multiple campuses
- **Student management** — admission, enrollment, grade tracking
- **Fee management** — fee heads, structures, challan generation, payment recording, PDF challans
- **User management** — RBAC with invites, role assignment, campus-level permissions
- **Background jobs** — async email, SMS, WhatsApp, PDF generation, bulk operations, data import
- **Dev tools** — super admin utilities for development phase

**Domain:** `sairex-sms.com`
**Brand:** Sairex Technologies

---

## 2. Tech Stack

### Core

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22.22.0 LTS (pinned in `.nvmrc`) |
| Framework | Next.js (App Router) | 16.1.6 (Turbopack dev) |
| Language | TypeScript | ^5 |
| React | React + React DOM | 19.2.3 |
| Database | PostgreSQL | localhost:5432, database: `sairex_db` |
| ORM | Prisma | ^5.17.0 |
| Auth | NextAuth.js v5 (beta) | ^5.0.0-beta.30 |
| Styling | Tailwind CSS v4 | ^4 |
| UI Library | Shadcn UI + custom Sx components | ^3.8.5 |

### Background Jobs

| Component | Technology | Version |
|-----------|-----------|---------|
| Queue Engine | BullMQ | ^5.69.3 |
| Redis Client | ioredis | ^5.9.3 |
| Redis Server | Memurai (Windows, Redis 7.2.5 compat) | local |

### External Services

| Service | Technology | Purpose |
|---------|-----------|---------|
| Email | Nodemailer → Titan Email SMTP | Transactional email |
| SMS | Axios → Veevo Tech API | SMS delivery |
| WhatsApp | whatsapp-web.js (Puppeteer) | WhatsApp messaging |
| PDF | PDFKit (server) + jsPDF/html2canvas (client) | Challan & report PDFs |
| File Storage | AWS S3 + sharp (WEBP optimization) | Logo & media asset upload with variants |

### Forms & Validation

| Component | Version |
|-----------|---------|
| react-hook-form | ^7.71.1 |
| @hookform/resolvers | ^5.2.2 |
| Zod | ^4.3.6 |

---

## 3. Repository Structure

```
c:\SairexSMS\
├── .cursor/rules/               # AI enforced coding rules
│   ├── sairex-component-standards.mdc
│   └── sairex-api-patterns.mdc
├── .nvmrc                       # Node 22.22.0
├── .gitignore
├── prisma/
│   └── schema.prisma            # Single source of truth for DB schema
├── backend/                     # Python scripts (legacy/utility)
│   ├── add_student.py
│   ├── admit_student.py
│   ├── create_fee_structure.py
│   ├── create_school.py
│   ├── generate_challan.py
│   ├── notification_service.py
│   ├── onboard_saas.py
│   ├── pay_challan.py
│   └── seed_fees.py
└── web/                         # Next.js application (main codebase)
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── auth.ts                  # NextAuth configuration
    ├── auth.config.ts           # NextAuth edge config
    ├── instrumentation.ts       # Worker bootstrap hook
    ├── app/                     # Next.js App Router
    │   ├── layout.tsx           # Root layout (fonts, theme, toaster)
    │   ├── page.tsx             # Landing page
    │   ├── globals.css
    │   ├── (auth)/              # Auth route group
    │   │   ├── layout.tsx
    │   │   ├── login/page.tsx
    │   │   ├── signup/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   ├── reset-password/page.tsx
    │   │   └── verify-email/page.tsx
    │   ├── onboarding/          # Multi-step org onboarding
    │   │   ├── layout.tsx
    │   │   ├── context.tsx      # OnboardingProvider (client state)
    │   │   ├── identity/page.tsx
    │   │   ├── legal/page.tsx
    │   │   ├── contact-address/page.tsx
    │   │   ├── branding/page.tsx
    │   │   ├── preview/page.tsx
    │   │   └── confirmation/page.tsx
    │   ├── admin/               # Protected admin panel
    │   │   ├── layout.tsx       # Sidebar + top bar shell
    │   │   ├── SidebarNav.tsx
    │   │   ├── MobileSidebar.tsx
    │   │   ├── ThemeToggle.tsx
    │   │   ├── LogoutButton.tsx
    │   │   ├── dashboard/page.tsx
    │   │   ├── organizations/page.tsx
    │   │   ├── regions/page.tsx
    │   │   ├── campuses/page.tsx
    │   │   ├── students/page.tsx
    │   │   ├── users/page.tsx
    │   │   ├── finance/page.tsx
    │   │   ├── finance/challans/[id]/print/page.tsx
    │   │   ├── finance/challans/[id]/print/PrintControls.tsx
    │   │   ├── jobs/page.tsx
    │   │   ├── dev-tools/page.tsx
    │   │   └── change-password/page.tsx
    │   └── api/                 # API routes (see §8)
    │       ├── auth/
    │       ├── onboarding/
    │       ├── organizations/
    │       ├── regions/
    │       ├── campuses/
    │       ├── students/
    │       ├── invites/
    │       ├── finance/
    │       ├── jobs/
    │       ├── cron/
    │       └── dev-tools/
    ├── components/
    │   ├── sx/                  # Custom SAIREX design system (see §11)
    │   │   ├── index.ts
    │   │   ├── sx-button.tsx
    │   │   ├── sx-page-header.tsx
    │   │   ├── sx-status-badge.tsx
    │   │   ├── sx-data-table.tsx
    │   │   ├── sx-form-section.tsx
    │   │   ├── sx-amount.tsx
    │   │   └── sx-profile-header.tsx
    │   ├── ui/                  # Shadcn UI primitives
    │   │   ├── button.tsx, input.tsx, select.tsx, dialog.tsx,
    │   │   ├── form.tsx, card.tsx, badge.tsx, tabs.tsx,
    │   │   ├── table.tsx, textarea.tsx, checkbox.tsx,
    │   │   ├── avatar.tsx, dropdown-menu.tsx, sheet.tsx,
    │   │   ├── scroll-area.tsx, separator.tsx, skeleton.tsx,
    │   │   ├── sonner.tsx, tooltip.tsx, label.tsx, switch.tsx
    │   │   └── ...
    │   └── theme-provider.tsx
    ├── lib/
    │   ├── prisma.ts            # Singleton PrismaClient
    │   ├── api-client.ts        # Client-side API wrapper (discriminated union)
    │   ├── auth-guard.ts        # requireAuth, requireRole, isSuperAdmin
    │   ├── tenant.ts            # scopeFilter, resolveOrgId, validateCrossRefs, assertOwnership
    │   ├── email.ts             # Nodemailer transport + sendEmail, sendVerificationEmail
    │   ├── whatsapp.ts          # whatsapp-web.js client
    │   ├── notifications.ts     # notifyParent → enqueues NOTIFICATION job
    │   ├── id-generators.ts     # generateOrganizationId (ORG-XXXXX, race-safe sequence)
    │   ├── theme-utils.ts       # Theme helpers
    │   ├── utils.ts             # cn() (clsx + tailwind-merge)
    │   ├── config/
    │   │   └── theme.ts         # Brand, design tokens, sidebar navigation
    │   ├── data/
    │   │   └── pakistan-geo.ts   # Province → District → Tehsil → City cascading data
    │   ├── validations/         # Zod schemas (see §12)
    │   │   ├── index.ts
    │   │   ├── onboarding.ts
    │   │   ├── organization.ts
    │   │   ├── organization-address.ts
    │   │   ├── organization-contact.ts
    │   │   └── signup.ts
    │   ├── pdf/                 # Server-side PDF generation (see §10)
    │   │   ├── index.ts
    │   │   ├── challan-pdf.ts
    │   │   └── report-pdf.ts
    │   ├── queue/               # BullMQ job system (see §9)
    │   │   ├── connection.ts
    │   │   ├── queues.ts
    │   │   ├── enqueue.ts
    │   │   ├── index.ts
    │   │   └── workers/
    │   │       ├── index.ts
    │   │       ├── email.worker.ts
    │   │       ├── otp.worker.ts
    │   │       ├── sms.worker.ts
    │   │       ├── whatsapp.worker.ts
    │   │       ├── notification.worker.ts
    │   │       ├── challan-pdf.worker.ts
    │   │       ├── report.worker.ts
    │   │       ├── bulk-sms.worker.ts
    │   │       └── import.worker.ts
    │   └── generated/
    │       └── prisma/          # Prisma generated client (gitignored)
    ├── scripts/
    │   ├── seed-admin.ts        # Create root org, SUPER_ADMIN user, sequence
    │   ├── start-workers.ts     # Standalone worker process for production
    │   ├── test-api-security.ts
    │   ├── test-password-flows.ts
    │   └── test-signup-invites.ts
    └── public/
        └── generated/           # Runtime-generated PDFs
            ├── challans/
            └── reports/
```

---

## 4. Database Schema

### Prisma Configuration

```prisma
generator client {
  provider = "prisma-client-py"          // Python client (backend scripts)
}

generator jsClient {
  provider = "prisma-client-js"          // JS client for Next.js
  output   = "../web/lib/generated/prisma"  // Custom output for monorepo
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Important:** The schema lives at `prisma/schema.prisma` (repo root), but the JS client is generated into `web/lib/generated/prisma/`. The `postinstall` script in `web/package.json` auto-generates it. The import in `web/lib/prisma.ts` is `from "@/lib/generated/prisma"`. A tsconfig path alias maps `@prisma/client` → `./lib/generated/prisma` for compatibility.

### Enums

| Enum | Values |
|------|--------|
| `PlatformRole` | SUPER_ADMIN, SUPPORT |
| `MembershipRole` | ORG_ADMIN, CAMPUS_ADMIN, TEACHER, ACCOUNTANT, PARENT, STAFF |
| `MembershipStatus` | ACTIVE, INVITED, SUSPENDED |
| `OrganizationCategory` | SCHOOL, COLLEGE, ACADEMY, INSTITUTE, UNIVERSITY, OTHERS |
| `OrganizationStructure` | SINGLE, MULTIPLE |
| `OrganizationStatus` | ACTIVE, SUSPENDED, ARCHIVED |
| `OnboardingStep` | ORG_IDENTITY, LEGAL, CONTACT_ADDRESS, BRANDING, COMPLETED |
| `AddressType` | HEAD_OFFICE, BILLING, CAMPUS, OTHER |
| `UnitScopeType` | REGION, SUBREGION, CITY, ZONE, CAMPUS |

### Models (18 total)

#### Identity & Auth

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **User** | id (auto-int), email (unique), password, name, isActive, emailVerifiedAt, emailVerifyToken, emailVerifyExpires, platformRole?, tokenVersion | Global user identity. Platform role is optional (null = regular user). |
| **VerificationCode** | id (cuid), userId, channel, target, codeHash (SHA-256), expiresAt, verified, verifiedAt, attempts, lockedUntil | OTP verification for email/mobile/WhatsApp during onboarding. Hashed codes, attempt tracking, lockout. |
| **PasswordResetToken** | id, userId, token (unique), expiresAt, usedAt | One-time password reset tokens. |

#### Organization & Structure

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **OrganizationSequence** | id (default 1), lastValue | Race-safe auto-increment for ORG-XXXXX IDs. |
| **Organization** | id (VarChar 11, e.g. "ORG-00001"), slug (unique), status, onboardingStep, organizationName, displayName, organizationCategory, organizationStructure, registrationNumber, taxNumber, establishedDate, address fields, contact fields, websiteUrl, logoUrl, createdByUserId | Tenant root entity. Contains all onboarding data (identity, legal, address, contact, branding) in flat columns. |
| **OrganizationContact** | id, organizationId, name, designation, email, phone, isPrimary | Additional contacts for the organization. |
| **OrganizationAddress** | id, organizationId, type (AddressType), country, province, city, area, postalCode, addressLine1/2, isPrimary | Multiple addresses per org (HQ, billing, campus, other). |
| **OrganizationBank** | id, organizationId, accountTitle, bankName, branchName, accountNumber, iban, swiftCode, isPrimary | Bank accounts for fee collection. |

#### Geographic Hierarchy (Region → SubRegion → City → Zone)

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Region** | id (cuid), name, **unitCode** (unique, e.g. `R01`) | Top-level geographic area (e.g. Punjab, Sindh). Optional. |
| **SubRegion** | id (cuid), name, **unitCode** (e.g. `S01`), regionId? | Optional layer under Region (e.g. South Punjab). Code scoped per parent region. |
| **City** | id (cuid), name, **unitCode** (unique, e.g. `LHR`, `ISB`) regionId?, subRegionId? | **Required for Campus.** Code derived from city name abbreviation. |
| **Zone** | id (cuid), name, **unitCode** (e.g. `Z01`), cityId | Optional subdivision within a city. Code scoped per parent city. |
| **Campus** | id, organizationId, name, campusCode (unique), campusSlug (unique), **unitCode** (e.g. `C01`), **fullUnitPath** (indexed, e.g. `R01-S02-LHR-Z01-C03`), address, cityId, zoneId?, ... | Operational unit. Code scoped per zone or city. fullUnitPath is the materialized hierarchy path. |
| **UnitCodeSequence** | id (cuid), scopeType (UnitScopeType), scopeId?, lastValue | Race-safe atomic counter per (scopeType, scopeId) pair. |

##### Unit Code System

All geo entities and campuses receive auto-generated `unitCode` values:

| Layer | Format | Example | Scope |
|-------|--------|---------|-------|
| Region | `R{nn}` | R01 | Global (root-level sequence) |
| SubRegion | `S{nn}` | S03 | Per parent region |
| City | 3-letter abbreviation | LHR, ISB, KHI | Unique globally (from known abbreviation table or name-derived) |
| Zone | `Z{nn}` | Z02 | Per parent city |
| Campus | `C{nn}` | C05 | Per zone (or city if no zone) |

Generation uses atomic `upsert` + `increment` on `UnitCodeSequence` inside a Prisma `$transaction`, preventing race conditions. Implementation: `web/lib/unit-code.ts`.

##### Materialized Unit Path (`fullUnitPath`)

Campus stores a `fullUnitPath` field (indexed, `VARCHAR(50)`) that concatenates the unitCodes of its entire lineage:

```
Region → SubRegion → City → Zone → Campus
R01    -  S02      -  LHR -  Z01 -  C03
```

Missing optional levels (Region, SubRegion, Zone) are skipped automatically. Examples:

| Campus | fullUnitPath |
|--------|-------------|
| DHA Boys (Lahore, Zone 1) | `R01-S01-LHR-Z01-C01` |
| Sahiwal (no zone) | `R01-S03-SWL-C01` |
| Model Town (no subregion) | `R01-LHR-Z02-C01` |

**Use cases:**
- **Prefix filtering** — `WHERE fullUnitPath LIKE 'R01-S02%'` for instant hierarchical queries (no joins)
- **Revenue routing** — fee challans, reports, dashboards
- **RBAC scoping** — user assigned `R01-S02` → filter `WHERE fullUnitPath LIKE 'R01-S02%'`
- **Audit safety** — historical financial records keep their path snapshot unchanged

**Generation:** `buildFullUnitPath()` in `web/lib/unit-code.ts` walks up the hierarchy inside the same `$transaction` as campus creation. Path is computed once on create and recomputed only if the campus is moved.

#### RBAC

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Membership** | id, userId, organizationId, role (MembershipRole), status, campusId? | User-to-org-to-campus bridge. Unique on [userId, organizationId]. |
| **Invitation** | id, email, organizationId, role, token (unique), invitedById, expiresAt, acceptedAt | Pending invitations. Token-based acceptance flow. |

#### Students & Finance

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Student** | id, fullName, admissionNo (unique), grade, feeStatus, organizationId, campusId | Student record. |
| **FeeHead** | id, organizationId, name, type, isSystemDefault | Fee category definitions (Tuition, Transport, etc.). |
| **FeeStructure** | id, organizationId, campusId, feeHeadId, name, amount (Decimal), currency, frequency, applicableGrade, isActive | Pricing rules per campus/head/grade. |
| **FeeChallan** | id, organizationId, campusId, studentId, challanNo (unique), issueDate, dueDate, totalAmount, paidAmount, status, paymentMethod, paidAt, generatedBy | Fee bill. Statuses: UNPAID, PAID, PARTIAL, OVERDUE. |

#### System

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Job** | id (cuid), type, queue, payload (Json), status, priority, attempts, maxAttempts, scheduledAt, startedAt, completedAt, failedAt, error, result (Json), organizationId?, userId? | Background job audit trail. Statuses: PENDING, PROCESSING, COMPLETED, FAILED, DEAD. |

### Key Relationships

```
User 1──∞ Membership ∞──1 Organization
User 1──∞ VerificationCode
User 1──∞ PasswordResetToken
User 1──∞ Invitation (invitedBy)
User 1──∞ Job

Organization 1──∞ Campus
Organization 1──∞ OrganizationContact
Organization 1──∞ OrganizationAddress
Organization 1──∞ OrganizationBank
Organization 1──∞ Student
Organization 1──∞ FeeHead
Organization 1──∞ FeeStructure
Organization 1──∞ FeeChallan
Organization 1──∞ Job

Region 1──∞ SubRegion
Region 1──∞ City
SubRegion 1──∞ City
City 1──∞ Zone
City 1──∞ Campus
Zone 1──∞ Campus

Campus 1──∞ Student
Campus 1──∞ FeeStructure
Campus 1──∞ FeeChallan
Student 1──∞ FeeChallan
FeeHead 1──∞ FeeStructure
```

---

## 5. Authentication & Authorization

### Auth Stack

- **NextAuth.js v5 (beta)** with Credentials provider and JWT strategy
- **Prisma Adapter** (`@auth/prisma-adapter`) for DB persistence
- **bcryptjs** for password hashing

### Auth Flow

1. **Signup** (`POST /api/auth/signup`):
   - With `inviteToken`: creates user + membership, email auto-verified
   - Without: creates user, sends verification email via background job
2. **Email Verification** (`GET /api/auth/verify-email?token=`): activates user
3. **Login** (`POST /api/auth/[...nextauth]`): validates email/password, requires verified email (platform admins exempt), returns JWT
4. **Session**: JWT contains `id`, `email`, `name`, `platformRole`, `role`, `organizationId`, `campusId`, `membershipId`
5. **Password Reset**: forgot-password → token email → reset-password

### Authorization Guards (`web/lib/auth-guard.ts`)

| Function | Behavior |
|----------|----------|
| `requireAuth()` | Session required. Must have `organizationId` OR `platformRole`. Returns `AuthUser` or 401/403. |
| `requireVerifiedAuth()` | Session required only — no org requirement. Used for onboarding. |
| `requireRole(guard, ...roles)` | 403 if user's `platformRole` or `role` not in allowed list. |
| `isSuperAdmin(guard)` | True when `platformRole === "SUPER_ADMIN"`. |

### Role Hierarchy

| Role | Scope | Access Level |
|------|-------|------|
| `SUPER_ADMIN` | Global | All orgs, all data, all operations |
| `SUPPORT` | Global | Read access (platform-level) |
| `ORG_ADMIN` | Organization | Full access within their org |
| `CAMPUS_ADMIN` | Campus | Full access within assigned campus |
| `ACCOUNTANT` | Campus | Finance operations |
| `TEACHER` | Campus | Student-related operations |
| `PARENT` | Campus | Read-only (own children) |
| `STAFF` | Campus | Limited operations |

### Route Protection

- `/admin/*` and `/onboarding/*`: require login (enforced in `auth.config.ts`)
- API routes: use `requireAuth()` or `requireVerifiedAuth()` per endpoint
- Public routes: signup, forgot-password, reset-password, verify-email, invite validation

---

## 6. Multi-Tenant Architecture

### Tenant Isolation (`web/lib/tenant.ts`)

All data access is tenant-scoped using four utilities:

| Utility | Purpose |
|---------|---------|
| `scopeFilter(guard, opts)` | Builds Prisma `where` clause. SUPER_ADMIN = `{}`, ORG_ADMIN = `{ organizationId }`, CAMPUS_ADMIN = `{ organizationId, campusId }`. |
| `resolveOrgId(guard, bodyOrgId)` | For writes: SUPER_ADMIN may override orgId via body; others use session value. |
| `validateCrossRefs(orgId, checks)` | Ensures referenced entities (campus, region, feeHead, student) belong to same org. Returns 403/404 if violated. |
| `assertOwnership(guard, recordOrgId)` | Verifies a record belongs to the user's org. SUPER_ADMIN bypasses. |

### Organization ID Generation

Race-safe sequence using `OrganizationSequence` table:
1. Upsert ensures row exists
2. Atomic `UPDATE ... SET lastValue = lastValue + 1 RETURNING lastValue`
3. Format: `ORG-XXXXX` (zero-padded to 5 digits)

---

## 7. Onboarding Flow

### Architecture

- **Client-side state**: `OnboardingProvider` (React Context + localStorage) holds draft data across steps
- **No per-step DB writes**: data is collected client-side through all steps
- **Single DB write**: `POST /api/onboarding/complete` creates the Organization + Membership in one transaction at the end
- **OTP verification**: email/mobile/WhatsApp verified during onboarding via `/api/onboarding/verify/send` and `/api/onboarding/verify/confirm`

### Steps

| Step | Route | Data Collected |
|------|-------|---------------|
| 1. Identity | `/onboarding/identity` | organizationName, displayName, category, structure |
| 2. Registration | `/onboarding/legal` | registrationNumber, taxNumber, establishedDate, certificate uploads |
| 3. HO Address & Contacts | `/onboarding/contact-address` | Full Pakistan address (province→district→tehsil→city), phone, mobile, WhatsApp, email with OTP verification |
| 4. Branding | `/onboarding/branding` | websiteUrl, logoUrl |
| 5. Preview | `/onboarding/preview` | Review all data, edit links per section |
| 6. Confirmation | `/onboarding/confirmation` | Shows created org ID, print/download/email actions |

### Navigation

Each step has **Back**, **Save** (to context), and **Next** buttons.

### OnboardingProvider State

```typescript
interface OnboardingDraft {
  identity: OnboardingIdentityInput | null;
  legal: OnboardingLegalInput | null;
  contactAddress: OnboardingContactAddressInput | null;
  branding: OnboardingBrandingInput | null;
  validatedSteps: StepKey[];
}

interface VerifiedFields {
  organizationEmail: VerifiedEntry | null;
  organizationMobile: VerifiedEntry | null;
  organizationWhatsApp: VerifiedEntry | null;
}
```

Persisted to `localStorage` keys: `sairex-onboarding-draft`, `sairex-onboarding-verified`.

---

## 8. API Routes Reference

### Auth (6 routes)

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET,POST | `/api/auth/[...nextauth]` | NextAuth | NextAuth catch-all |
| POST | `/api/auth/signup` | None | Create account (with/without invite) |
| GET | `/api/auth/verify-email` | None | Verify email token, activate user |
| POST | `/api/auth/forgot-password` | None | Request password reset email |
| POST | `/api/auth/reset-password` | None | Reset password with token |
| POST | `/api/auth/change-password` | `requireAuth` | Change own password |

### Onboarding (6 routes)

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/api/onboarding/status` | `requireVerifiedAuth` | Get onboarding state + next URL |
| POST | `/api/onboarding/identity` | `requireVerifiedAuth` | Step 1: save identity |
| POST | `/api/onboarding/legal` | `requireVerifiedAuth` | Step 2: save legal info |
| POST | `/api/onboarding/contact-address` | `requireVerifiedAuth` | Step 3: save address + contacts |
| POST | `/api/onboarding/branding` | `requireVerifiedAuth` | Step 4: save branding |
| POST | `/api/onboarding/complete` | `requireVerifiedAuth` | Final: create org + membership |
| POST | `/api/onboarding/verify/send` | `requireVerifiedAuth` | Send OTP (email/mobile/WhatsApp) |
| POST | `/api/onboarding/verify/confirm` | `requireVerifiedAuth` | Verify OTP code |

### Organizations (5 routes)

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/api/organizations` | `requireAuth` | List orgs (scoped) |
| POST | `/api/organizations` | SUPER_ADMIN | Create organization |
| GET | `/api/organizations/next-id` | SUPER_ADMIN | Preview next ORG-XXXXX |
| GET,POST,PUT,DELETE | `/api/organizations/[id]/contacts` | `requireAuth` + ownership | CRUD org contacts |
| GET,POST,PUT,DELETE | `/api/organizations/[id]/addresses` | `requireAuth` + ownership | CRUD org addresses |

### Core Resources

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET,POST | `/api/regions` | `requireAuth` | List/create geo entities (region, subRegion, city, zone) |
| GET,POST | `/api/campuses` | `requireAuth` | List/create campuses |
| GET,POST | `/api/students` | `requireAuth` | List/admit students |
| GET,POST | `/api/invites` | ORG_ADMIN+ | List/send invites |
| PUT | `/api/invites` | ORG_ADMIN+ | Lock/unlock user |
| GET | `/api/invites/validate` | None | Validate invite token |

### Finance (3 routes)

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET,POST | `/api/finance/heads` | `requireAuth` | List/create fee heads |
| GET,POST | `/api/finance/structures` | `requireAuth` | List/create fee structures |
| GET,POST,PUT | `/api/finance/challans` | `requireAuth` | List/generate/pay challans |

### Jobs (6 routes)

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/api/jobs` | ORG_ADMIN+ | List jobs (paginated, filterable) |
| GET | `/api/jobs/[id]` | `requireAuth` | Poll job status |
| POST | `/api/jobs/challan-pdf` | ACCOUNTANT+ | Enqueue challan PDF |
| POST | `/api/jobs/report` | ACCOUNTANT+ | Enqueue report generation |
| POST | `/api/jobs/bulk-sms` | ORG_ADMIN+ | Enqueue bulk SMS (max 5000) |
| POST | `/api/jobs/import` | CAMPUS_ADMIN+ | Enqueue CSV import (max 10k rows) |

### System

| Method | Path | Auth | Summary |
|--------|------|------|---------|
| GET | `/api/cron/reminders` | ORG_ADMIN+ | Enqueue reminders for due challans |
| GET,DELETE | `/api/dev-tools` | SUPER_ADMIN | List/delete users & orgs (dev only) |

---

## 9. Background Job System

### Architecture

```
Client → API Route → enqueue() → [Postgres Job row] + [BullMQ queue]
                                        ↓
                          Worker picks up job from Redis
                                        ↓
                          Worker processes + updates Job status
```

**Dual-write pattern:** Every job is first persisted to Postgres (audit trail) then enqueued to BullMQ (processing). If Redis is down, the Postgres record survives.

### Queues (9)

| Queue Constant | Name | Concurrency | Purpose |
|---------------|------|-------------|---------|
| `EMAIL_QUEUE` | email | 5 | Email delivery |
| `OTP_QUEUE` | otp | 5 | OTP code delivery |
| `SMS_QUEUE` | sms | 3 | SMS via Veevo Tech |
| `WHATSAPP_QUEUE` | whatsapp | 1 | WhatsApp via puppeteer (rate limited: 1/2s) |
| `NOTIFICATION_QUEUE` | notification | 3 | Fan-out → email + SMS + WhatsApp |
| `CHALLAN_PDF_QUEUE` | challan-pdf | 2 | PDF generation |
| `REPORT_QUEUE` | report | 2 | Report PDF generation |
| `BULK_SMS_QUEUE` | bulk-sms | 1 | Fan-out → individual SMS jobs |
| `IMPORT_QUEUE` | import | 1 | CSV data import |

### Default Job Options

```typescript
{
  attempts: 3,
  backoff: { type: "exponential", delay: 2000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 }
}
```

### Worker Bootstrap

- **Development:** `instrumentation.ts` (Next.js hook) starts workers in-process
- **Production:** `npm run worker` → `scripts/start-workers.ts` (separate process)
- **All workers use dynamic imports** for Prisma and external modules to avoid initialization timing issues

### enqueue() Interface

```typescript
interface EnqueueOptions {
  type: string;           // EMAIL, SMS, OTP, WHATSAPP, NOTIFICATION, CHALLAN_PDF, REPORT, BULK_SMS, IMPORT
  queue: string;          // Queue constant
  payload: Record<string, unknown>;
  userId?: number;
  organizationId?: string;
  priority?: number;      // Higher = more priority
  scheduledAt?: Date;
}
```

Returns the `Job.id` (cuid) for polling.

### Fan-out Workers

- **notification.worker**: Receives student + challan data → enqueues separate EMAIL, SMS, WHATSAPP jobs
- **bulk-sms.worker**: Receives message + recipients[] → enqueues one SMS job per recipient

---

## 10. PDF Generation

### Challan PDF (`lib/pdf/challan-pdf.ts`)

- PDFKit landscape 792×432
- Three copies per page: Bank Copy, School Copy, Student Copy
- Includes: org info, campus, bank details, student details, fee breakdown table, PAID stamp
- Output: `public/generated/challans/challan-{no}-{timestamp}.pdf`

### Report PDF (`lib/pdf/report-pdf.ts`)

- PDFKit A4 portrait
- Configurable columns + rows table with pagination
- Report types: FEE_COLLECTION, FEE_DEFAULTERS, STUDENT_LIST
- Includes: org header, title, subtitle, generated-by, optional summary
- Output: `public/generated/reports/report-{type}-{timestamp}.pdf`

---

## 11. UI Component System

### Sx Components (`components/sx/`)

Custom SAIREX design components built on top of Shadcn UI:

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `SxPageHeader` | Page title bar with optional actions | `title`, `subtitle`, `actions` |
| `SxButton` | Themed button with loading state | `sxVariant` (primary/secondary/outline/ghost/danger), `loading`, `icon` |
| `SxDataTable<T>` | Generic data table with columns, loading skeleton | `columns: SxColumn<T>[]`, `data`, `onRowClick`, `loading`, `emptyMessage` |
| `SxStatusBadge` | Status/type display with variants | `status` or `feeStatus`, auto-maps to variant (success/destructive/warning/info/muted + fee-*) |
| `SxFormSection` | Form field grouping | `title`, `description`, `columns` (1/2/3 grid) |
| `SxFormLayout` | Max-width form container | `children` |
| `SxFormCard` | Bordered card for form sections | `children` |
| `SxFormField` | Label + helper + error wrapper | `label`, `helper`, `error`, `fullWidth` |
| `SxActionBar` | Sticky bottom action bar | `children` |
| `SxAmount` | Formatted currency display | `amount`, `currency` (default "Rs."), `decimals`, `colorNegative` |
| `SxProfileHeader` | Avatar + name + meta display | `name`, `meta[]`, `status`, `actions`, `imageUrl` |

### SxColumn Interface

```typescript
interface SxColumn<T> {
  key: keyof T | string;
  header: string;
  numeric?: boolean;
  mono?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
}
```

### Shadcn UI Components Used

Avatar, Badge, Button, Card, Checkbox, Dialog, DropdownMenu, Form (+ FormField, FormItem, FormLabel, FormControl, FormMessage), Input, Label, ScrollArea, Select, Separator, Sheet, Skeleton, Sonner (Toaster), Switch, Table, Tabs, Textarea, Tooltip

---

## 12. Validation Layer

All validations use **Zod v4** with **zodResolver** for react-hook-form integration.

### Schema Files (`lib/validations/`)

| File | Schemas | Used By |
|------|---------|---------|
| `organization.ts` | `createOrganizationSchema`, `updateOrganizationSchema` | Admin org CRUD |
| `organization-address.ts` | `createOrganizationAddressSchema`, `updateOrganizationAddressSchema` | Address CRUD |
| `organization-contact.ts` | `createOrganizationContactSchema`, `updateOrganizationContactSchema` | Contact CRUD |
| `onboarding.ts` | `identitySchema`, `legalSchema`, `contactAddressSchema`, `brandingSchema`, `onboardingCompleteSchema` | Onboarding flow |
| `signup.ts` | `signupSchema` | Auth signup |

### Shared Constants

```typescript
ORGANIZATION_CATEGORY: ["SCHOOL", "COLLEGE", "ACADEMY", "INSTITUTE", "UNIVERSITY", "OTHERS"]
ORGANIZATION_STRUCTURE: ["SINGLE", "MULTIPLE"]
ORGANIZATION_STATUS: ["ACTIVE", "SUSPENDED", "ARCHIVED"]
PAKISTAN_PROVINCES: [...] // Full list of Pakistani provinces
```

### Pakistan Geo Data (`lib/data/pakistan-geo.ts`)

Cascading data structure: Province → District → Tehsil → City. Used in the onboarding contact-address step for cascading dropdowns.

---

## 13. Admin Pages

### Page Structure Standard

Every admin page follows this structure (reference: `organizations/page.tsx`):

```
1. "use client" directive
2. Import block (React → resolvers → sonner → lucide → api-client → validations → Sx → shadcn)
3. TypeScript interfaces
4. Column definitions as SxColumn<T>[]
5. Helper functions
6. Default export component:
   - State hooks
   - useCallback data-fetching with api.get<T>()
   - useForm<T>({ resolver: zodResolver(schema) })
   - Submit handler with api.post<T>() + field-error mapping
   - Dialog open/close with reset()
   - JSX: SxPageHeader → SxDataTable → Dialog with SxFormSection
```

### Admin Page Inventory

| Page | Route | Features |
|------|-------|----------|
| **Dashboard** | `/admin/dashboard` | Stats cards (orgs, campuses, students), revenue chart placeholder |
| **Organizations** | `/admin/organizations` | CRUD table, create dialog with Zod validation, next-ID preview |
| **Geo Hierarchy** | `/admin/regions` | Tabs: Regions, Sub-Regions, Cities, Zones. Create dialog per type. |
| **Campuses** | `/admin/campuses` | List + create dialog (org, region, name, code, city) |
| **Students** | `/admin/students` | List + admit dialog (org, campus, name, admissionNo, grade) |
| **Users & Invites** | `/admin/users` | Users table, invites table, invite dialog, lock/unlock |
| **Finance** | `/admin/finance` | Tabs: Fee Categories, Pricing Rules, Bills. Create/payment dialogs |
| **Print Challan** | `/admin/finance/challans/[id]/print` | Server component, 3-copy challan layout, print controls |
| **Job Monitor** | `/admin/jobs` | Stats cards, status/type filters, paginated table, job detail dialog, auto-refresh |
| **Dev Tools** | `/admin/dev-tools` | Tabs: pending accounts, users & orgs. Permanent delete with confirmation |
| **Change Password** | `/admin/change-password` | Current + new + confirm password form |

---

## 14. Navigation & Sidebar

Defined in `lib/config/theme.ts`:

```
├── Dashboard                    (/admin/dashboard)
├── Core Setup
│   ├── Organizations            (/admin/organizations)
│   ├── Geo Hierarchy            (/admin/regions)
│   └── Campuses                 (/admin/campuses)
├── Management
│   ├── Students                 (/admin/students)
│   └── Fee Module               (/admin/finance)
├── Admin
│   └── Users & Invites          (/admin/users)
├── System
│   └── Job Monitor              (/admin/jobs)
└── Development
    └── Dev Tools                (/admin/dev-tools)
```

Icons: LayoutDashboard, Building2, Map, School, GraduationCap, Wallet, Users, Activity, Wrench (from lucide-react).

---

## 15. External Services

### Email (Nodemailer)

```
Host: smtp.titan.email
Port: 465 (SSL)
From: alert@sairex-sms.com ("Sairex SMS")
```

Used for: verification emails, password reset, invitations, OTP delivery, notifications.

### SMS (Veevo Tech)

```
API: https://api.veevotech.com/sendsms
Auth: hash parameter (env: VEEVO_HASH)
Sender: env: VEEVO_SENDER
```

Dev mode fallback: logs SMS to console if env vars missing.

### WhatsApp (whatsapp-web.js)

```
Strategy: Puppeteer-based WhatsApp Web automation
Auth: LocalAuth (.wwebjs_auth directory)
Init: QR code displayed in terminal on first run
Phone format: 0300... → 92300...@c.us
```

Rate limited: 1 message per 2 seconds.

---

## 16. Environment Variables

### Required (`web/.env.local`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `postgresql://postgres:pass@localhost:5432/sairex_db?schema=public` | PostgreSQL connection |
| `NEXTAUTH_SECRET` | `<64-char hex>` | JWT signing secret |
| `NEXTAUTH_URL` | `http://localhost:3000` | NextAuth base URL |
| `SMTP_HOST` | `smtp.titan.email` | Email server |
| `SMTP_PORT` | `465` | Email port |
| `SMTP_USER` | `alert@sairex-sms.com` | Email user |
| `SMTP_PASS` | `<password>` | Email password |
| `SMTP_FROM_NAME` | `Sairex SMS` | Email from name |

### Optional

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Redis connection (default: `redis://127.0.0.1:6379`) |
| `VEEVO_HASH` | Veevo Tech SMS API key |
| `VEEVO_SENDER` | SMS sender number |
| `AWS_REGION` | AWS S3 region for media storage |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_S3_BUCKET` | S3 bucket name for assets |
| `NEXT_PUBLIC_CDN_URL` | CDN base URL for serving uploaded assets |

---

## 16a. Enterprise Media Asset System

### Overview

SAIREX uses AWS S3 with server-side image processing (sharp) for all media uploads.
Uploads are validated, optimized to WEBP, and stored as versioned variants (SM/MD/LG).

### Architecture

```
Browser (FormData) → POST /api/media/logo/upload
  → Validate (dimensions, format, size)
  → Generate WEBP variants (SM 64px, MD 128px, LG 256px, ORIGINAL)
  → Upload all to S3
  → Delete previous version from S3
  → Save MediaAsset rows (versioned)
  → Update Organization branding fields
  → Return variant URLs to browser
```

### Models

- **`MediaAsset`** — versioned audit table per uploaded file
  - Fields: `type`, `variant`, `url`, `key`, `size`, `mimeType`, `width`, `height`, `version`, `createdBy`
- **`Organization`** branding fields:
  - `logoUrl` — primary logo URL (MD variant)
  - `logoKey` — S3 key for deletion
  - `logoUpdatedAt` — cache-busting timestamp
  - `logoLightUrl` — light theme logo
  - `logoDarkUrl` — dark theme logo
  - `logoPrintUrl` — print/report logo

### `MediaType` Enum

| Value | Usage |
|-------|-------|
| `LOGO` | Organization logo |
| `FAVICON` | Browser favicon |
| `DOCUMENT` | Registration certificates, NTN, etc. |

### `MediaVariant` Enum

| Value | Size | Usage |
|-------|------|-------|
| `ORIGINAL` | Full size (WEBP) | Archive / high-res |
| `SM` | 64px | Sidebar, tiny icons |
| `MD` | 128px | Header, cards |
| `LG` | 256px | Reports, challans |
| `DARK` | — | Dark theme (future) |
| `PRINT` | — | Print output (future) |

### Key Files

| File | Purpose |
|------|---------|
| `lib/s3.ts` | Shared S3 client singleton |
| `lib/media/validate-image.ts` | Validates dimensions (128–4096), format, size (5 MB) |
| `lib/media/generate-variants.ts` | Generates SM/MD/LG WEBP variants via sharp |
| `lib/media/delete-file.ts` | Safe S3 object/prefix deletion |
| `lib/media/index.ts` | Barrel export |
| `app/api/media/logo/upload/route.ts` | Enterprise upload endpoint (FormData → validate → optimize → S3 → save) |
| `app/api/media/logo/upload-url/route.ts` | Legacy pre-signed URL endpoint |
| `app/api/media/logo/save/route.ts` | Legacy save endpoint |
| `app/api/media/logo/rollback/route.ts` | Rollback to previous logo version |
| `app/onboarding/branding/page.tsx` | Drag-and-drop upload UI with variant preview |

### Versioning

Files are never overwritten. Each upload increments the version:
```
organizations/{orgId}/branding/logo_v1_original.webp
organizations/{orgId}/branding/logo_v1_sm.webp
organizations/{orgId}/branding/logo_v2_original.webp  ← new version
```

Previous version S3 objects are deleted on new upload. MediaAsset rows are kept for audit.

### Rollback

`POST /api/media/logo/rollback` with `{ version: N }` — restores Organization branding fields from a previous MediaAsset version.

### Constraints

- Accepted types: PNG, JPG, WEBP, SVG
- Min dimensions: 128×128
- Max dimensions: 4096×4096
- Max file size: 5 MB
- Output format: WEBP (quality 85–90)

### API Client

`api.upload<T>(endpoint, formData)` method added to `lib/api-client.ts` for multipart uploads.
Skips `Content-Type: application/json` header so browser sets multipart boundary automatically.

---

## 17. Scripts & Tooling

### npm Scripts (`web/package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `postinstall` | `npx prisma generate --schema ../prisma/schema.prisma --generator jsClient` | Auto-generate Prisma client |
| `dev` | `next dev` | Development server (Turbopack) |
| `build` | `prisma generate ... && next build` | Production build with Prisma |
| `start` | `next start` | Production server |
| `lint` | `eslint` | Lint check |
| `worker` | `npx tsx scripts/start-workers.ts` | Standalone worker process |

### Utility Scripts

| Script | Purpose |
|--------|---------|
| `scripts/seed-admin.ts` | Create root org (ORG-00001), SUPER_ADMIN user, org sequence |
| `scripts/start-workers.ts` | Production worker runner (all 9 queues) |
| `scripts/test-api-security.ts` | API security testing |
| `scripts/test-password-flows.ts` | Password flow testing |
| `scripts/test-signup-invites.ts` | Signup + invite flow testing |

### Backend Python Scripts

Located in `backend/`. These are utility/legacy scripts for direct DB operations:
`add_student.py`, `admit_student.py`, `create_fee_structure.py`, `create_school.py`, `generate_challan.py`, `notification_service.py`, `onboard_saas.py`, `pay_challan.py`, `seed_fees.py`

---

## 18. Known Issues & Technical Debt

### Bugs

1. **SxAmount prop mismatch**: `finance/page.tsx` passes `value={...}` but `SxAmount` expects `amount={...}` → renders "Rs. NaN"
2. **GET /api/jobs/[id]** has no org ownership check — any authenticated user can poll any job

### Non-compliance with Coding Standards

Several admin pages don't fully comply with the enforced rules in `.cursor/rules/`:

| Page | Issues |
|------|--------|
| `regions/page.tsx` | Uses inline `rules={{}}` instead of zodResolver (B8) |
| `campuses/page.tsx` | Uses inline `rules={{}}` instead of zodResolver (B8) |
| `students/page.tsx` | Uses inline `rules={{}}` instead of zodResolver (B8) |
| `change-password/page.tsx` | Uses inline `rules={{}}` and manual validation (B8) |
| `jobs/page.tsx` | Uses raw `<select>` element (B4) |
| `dashboard/page.tsx` | Uses hardcoded color classes (B7) |
| `forgot-password/page.tsx` | Uses raw `fetch()` instead of `api.post()` (B6) |
| `reset-password/page.tsx` | Uses raw `fetch()` instead of `api.post()` (B6) |

### Architecture Notes

- **Prisma monorepo setup**: Schema at repo root, JS client generated to `web/lib/generated/prisma` with custom output + tsconfig path alias. Requires `npx prisma generate` after schema changes.
- **WhatsApp client**: Puppeteer-based, requires headless Chrome, QR scan on first run. Not suitable for production without a dedicated WhatsApp Business API.
- **PDF storage**: Generated to `public/generated/` — works in dev but needs cloud storage (S3) for production.
- **Cron reminders**: Currently triggered manually via API call. Needs an external scheduler (cron job or cloud function) for automatic execution.
- **Worker resilience**: If Redis is down, jobs are saved in Postgres but not processed until Redis returns and jobs are manually re-enqueued.

---

## 19. Coding Standards (Enforced Rules)

Two rule files in `.cursor/rules/` are enforced for all code generation:

### Component Standards (`sairex-component-standards.mdc`)

**Banned patterns in `web/app/admin/**`:**
- No raw HTML: `<table>`, `<button>`, `<input>`, `<select>`, `<option>` → use Sx/shadcn components
- No `alert()`/`confirm()`/`prompt()` → use `toast` from sonner
- No raw `fetch()` → use `api` from `@/lib/api-client`
- No hardcoded Tailwind color classes (e.g. `bg-blue-600`) → use design tokens only
- No `any` type annotations
- No inline `rules={{}}` validation → use `zodResolver` + Zod schema
- No custom modal `<div>` → use shadcn `Dialog`

**Required design tokens** (allowed color classes):
```
bg-background, bg-card, bg-muted, bg-primary, bg-secondary, bg-accent,
bg-destructive, bg-success/15, bg-warning/15, bg-info/15,
text-foreground, text-muted-foreground, text-primary, text-destructive,
text-success, text-warning, text-info,
border-border, border-input, ring-ring
```

### API Patterns (`sairex-api-patterns.mdc`)

**Client-side API calls must:**
1. Use `api.get<T>()` / `api.post<T>()` etc. (never raw `fetch()`)
2. Include type parameter: `api.get<Organization[]>(...)`
3. Handle discriminated union: `if (result.ok) { ... } else if (result.fieldErrors) { ... } else { ... }`
4. Map field errors to form: `form.setError(field, { message })`
5. Show toast on success/error

---

*End of Blueprint*
