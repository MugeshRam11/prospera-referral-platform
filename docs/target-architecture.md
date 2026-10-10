# Target Architecture — Prospera Referral Platform

**Document Version:** 1.0.0  
**Status:** Architectural Proposal (Phase 2)  
**Author:** Antigravity AI Engineering Team  
**Scope:** Rebuilt Backend for `prospera-referral-platform`  
**Reference Baseline:** [`docs/existing-platform-audit.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/existing-platform-audit.md)

---

## 1. Executive Overview

The Prospera Referral Platform is a B2B/B2C referral and commission management system primarily operating in the UAE. The platform enables referral partners to submit business leads, coordinators to route and manage them, sales agents to qualify and close deals, and administrators to oversee compliance (KYC), commission settlements, and bank withdrawals.

The legacy architecture (an Odoo 17 custom addon combining headless CMS with business logic) exhibited severe vulnerabilities and financial integrity flaws documented in the platform audit:
- Insecure authentication, client-controlled roles, and hardcoded OTPs (`0000`).
- Public-by-default endpoints and unauthenticated `.sudo()` calls.
- Duplicate commission generation on record updates (double-crediting).
- Inconsistent and race-prone withdrawal calculations.
- Plaintext credentials and exposed personal/financial data in repositories.

This document establishes the **Target Architecture** for the complete Node.js/TypeScript/PostgreSQL rebuild, designed for **strict financial integrity, zero-trust security, tenant data isolation, and high maintainability**.

---

## 2. Architectural Principles

1. **Financial Immutability & Double-Entry Principles:**  
   Commission and withdrawal records are append-only financial ledgers. Balances are derived mathematical sums of ledger entries—never arbitrarily incremented or decremented mutable integer columns.

2. **Zero-Trust Security & Centralized Authorization:**  
   All routes require explicit authentication by default. Access control is enforced through centralized policy middleware based on authenticated identities, verified roles, and explicit resource ownership. No client-supplied role or company assignment is ever trusted.

3. **Domain-Driven Modularization:**  
   The platform is structured into decoupled, domain-focused modules (`auth`, `users`, `kyc`, `referrals`, `commissions`, `withdrawals`, `cms`, `notifications`, `audit`).

4. **Strict Schema & Type Safety:**  
   PostgreSQL enforces relational constraints, non-nullable foreign keys, unique indices, and fixed-precision decimals. The application layer enforces end-to-end type safety via TypeScript and runtime boundary validation with Zod.

5. **Separation of PII and Sensitive Documents:**  
   Private compliance documents (Emirates ID, Passwords, Trade Licenses) are never stored in database blobs or public directories. They reside in private, encrypted object storage with access strictly governed by short-lived pre-signed URLs.

---

## 3. Technology Stack & Component Topology

```
                       ┌────────────────────────────────────────────────────────┐
                       │               Clients / Consumer Layer                 │
                       │  - Referral Web Portal (Next.js 14 Frontend)           │
                       │  - Admin / Coordinator / Agent Backoffice              │
                       │  - Public Marketing Site (Landing, FAQ, Services)      │
                       └───────────────────────────┬────────────────────────────┘
                                                   │ HTTPS / REST (JSON)
                                                   ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Express API Gateway / Server                                  │
│  - Reverse Proxy / CORS / Helmet / Rate Limiting (express-rate-limit)                         │
│  - Request Correlation ID / Structured Logging / JSON Parsing                                 │
│  - Centralized Route Dispatcher (`/api/v1`)                                                   │
└───────┬───────────────────┬───────────────────┬───────────────────┬───────────────────┬───────┘
        │                   │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ Auth & Session│   │  Lead Intake  │   │  Commission   │   │  Withdrawal   │   │  KYC / Compliance
│    Module     │   │ & CRM Pipeline│   │ Ledger Engine │   │ Ledger Engine │   │    Module     │
│ - Timed OTP   │   │ - Intake Zod  │   │ - Idempotent  │   │ - Withdrawable│   │ - S3 Presigned│
│ - Argon2id    │   │ - Assignment  │   │   Accruals    │   │   Formula     │   │   Uploads     │
│ - Revocation  │   │ - Stage Engine│   │ - Snapshots   │   │ - Atomic Locks│   │ - Admin Review│
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │                   │                   │
        └───────────────────┴─────────────┬─────┴───────────────────┴───────────────────┘
                                          │ Prisma ORM (Type-Safe Client)
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                             PostgreSQL 14+ Relational Database                                │
│  - Normalized relational tables with Foreign Keys & CASCADE/RESTRICT rules                    │
│  - Compound Unique Constraints (Idempotency guarantees)                                       │
│  - Fixed-precision DECIMAL(12, 2) currency storage (AED)                                      │
│  - High-performance B-tree indices on foreign keys, status filters, and timestamps           │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
                                          │
        ┌─────────────────────────────────┴─────────────────────────────────┐
        ▼                                                                   ▼
┌───────────────────────────────────────────────┐   ┌───────────────────────────────────────────┐
│       Private Cloud Object Storage            │   │      Transactional Email Service          │
│       (AWS S3 / Cloudflare R2 / GCS)          │   │      (SendGrid / AWS SES / Postmark)      │
│ - Encrypted at rest (AES-256 / KMS)           │   │ - Cryptographically random 6-digit OTP    │
│ - Ephemeral pre-signed download URLs (15 min) │   │ - Won lead alerts, payout confirmations   │
└───────────────────────────────────────────────┘   └───────────────────────────────────────────┘
```

---

## 4. Security & Authentication Architecture

### 4.1. Identity Management & Registration
- **Self-Registration Constraint:** The public signup endpoint creates accounts with role `REFERRAL_PARTNER` exclusively. Roles `ADMIN`, `COORDINATOR`, and `AGENT` can only be provisioned by authenticated administrators.
- **Account State Machine:** Accounts transition through explicit statuses:
  - `PENDING_VERIFICATION`: Awaiting initial email OTP verification.
  - `PENDING_APPROVAL`: Email verified; pending administrator KYC validation.
  - `ACTIVE`: Approved; permitted to submit referrals and manage withdrawals.
  - `SUSPENDED`: Access revoked due to compliance, fraud, or administrative hold.
  - `DEACTIVATED`: Archived or requested closure.

### 4.2. Secure Authentication & Session Lifecycle
- **Password Security:** Passwords hashed with **Argon2id** (or bcrypt with salt round 12+). Plaintext passwords are never logged, serialized, or returned in API responses.
- **Session Tokens:** Sessions use cryptographically secure 256-bit random tokens (`crypto.randomBytes(32)`). The database stores only the SHA-256 hash of the session token. Client receives either an `httpOnly`, `Secure`, `SameSite=Strict` cookie or an authorization bearer token.
- **Session Revocation:** Sessions have strict `expires_at` (e.g. 7 days), sliding idle timeouts (`last_active_at`), and an explicit `revoked_at` timestamp. Password changes and security resets revoke all active sessions immediately.

### 4.3. One-Time Passwords (OTP)
- **Random Code Generation:** Cryptographically generated 6-digit integers (`crypto.randomInt(100000, 1000000)`). The legacy hardcoded `"0000"` is permanently eliminated.
- **Storage & Hashing:** OTPs are stored in the database hashed using SHA-256 with an ephemeral salt.
- **Throttling & Lockout:**
  - Validity: 10 minutes from issuance.
  - Maximum verification attempts: 5 attempts per challenge.
  - Rate limiting: Maximum 1 OTP request every 60 seconds per email/IP address.
  - Maximum 5 requests per hour. Exceeding locks the target account temporarily.

### 4.4. Social Login (Google OAuth)
- The backend strictly verifies the Google ID token's cryptographic signature using Google's public keys via official SDKs.
- Identity lookup keys off the verified token claim `sub` (Google Subject ID) and verified `email` (`email_verified === true`). Client-supplied email parameters in the request body are disregarded.

### 4.5. Sensitive Data & Bank Credentials
- Bank details (IBAN, SWIFT, Account Holder) are isolated in a dedicated table `bank_accounts`.
- Sensitive fields are encrypted at rest using application-level AES-256-GCM envelope encryption. The database retains plaintext only for non-sensitive descriptors (Bank Name, Account Holder Name, and `last4_iban`).

---

## 5. Domain Services & Module Boundaries

### 5.1. Auth & Identity Module (`src/modules/auth`)
- Responsible for signup, login, session validation, OTP lifecycle, logout, and password recovery.
- Issues authenticated user context to Express middleware (`req.user`, `req.session`).

### 5.2. Users & Team Management (`src/modules/users`)
- Manages user profiles, role assignments, and organizational relationships.
- Manages Coordinator-to-Partner assignments (`coordinator_id`) and Coordinator-to-Agent hierarchies.

### 5.3. KYC & Compliance Module (`src/modules/kyc`)
- Manages compliance verification for individuals and corporations.
- Generates pre-signed S3 upload URLs enforcing content-type (`application/pdf`, `image/jpeg`, `image/png`) and file size limits (maximum 10 MB).
- Implements administrative review workflow (`APPROVED`, `REJECTED`, `CHANGES_REQUESTED`).

### 5.4. Referrals & CRM Pipeline Module (`src/modules/referrals`)
- Validates and ingests referral leads submitted by partners.
- Coordinates lead assignment from Coordinator to sales Agent.
- Manages stage transitions: `DRAFT` ➔ `SUBMITTED` ➔ `ASSIGNED` ➔ `CONTACTED` ➔ `QUALIFIED` ➔ `PROPOSAL_SENT` ➔ `NEGOTIATION` ➔ `WON` or `LOST`.
- Records immutable lead status history and lost reasons.

### 5.5. Commission Ledger Module (`src/modules/commissions`)
- Listens to lead status transitions to `WON`.
- Computes partner and agent commission based on frozen commission rules or explicit deal percentages.
- Writes immutable, idempotent ledger accrual records.

### 5.6. Withdrawal & Payout Module (`src/modules/withdrawals`)
- Validates withdrawal requests against the single authoritative balance formula.
- Manages withdrawal states: `REQUESTED` ➔ `UNDER_REVIEW` ➔ `APPROVED` ➔ `PROCESSING` ➔ `PAID` or `REJECTED`.
- Prevents concurrent requests via atomic locking.

### 5.7. Content & Marketing CMS Module (`src/modules/cms`)
- Delivers public content (services, FAQs, banners, team members, blog posts) to the Next.js frontend via cached REST endpoints.

### 5.8. Audit Logging Module (`src/modules/audit`)
- Intercepts all mutating administrative actions (role changes, KYC status updates, commission overrides, withdrawal payouts) and writes tamper-evident audit records.

---

## 6. Financial Integrity & Ledger Architecture

The core defect of the legacy Odoo implementation was non-idempotent commission creation upon lead updates and conflicting withdrawal formulas. The rebuild enforces a **double-entry, ledger-based financial model**.

### 6.1. Idempotency Guarantees
- A lead can only transition to `WON` once.
- Commission accrual rows are uniquely constrained by `(lead_id, recipient_user_id, entry_type)`.
- If an administrator updates a note, contact detail, or tag on an already-won lead, the commission engine detects the existing accrual and skips generation without side effects.

### 6.2. Balance Derivation Formula
No mutable `balance`, `total_commission`, or `withdrawable_amount` columns exist on the `users` table. All balances are strictly computed from ledger rows:

$$\text{Total Gross Earned} = \sum_{\text{Accruals}} \text{Amount} - \sum_{\text{Reversals}} \text{Amount}$$

$$\text{Locked / Inactive Commission} = \sum_{\text{Pending Maturity / Dispute}} \text{Amount}$$

$$\text{Completed Payouts} = \sum_{\text{Status = PAID}} \text{Withdrawal Amount}$$

$$\text{Active Reserved Payouts} = \sum_{\text{Status} \in \{\text{REQUESTED, APPROVED, PROCESSING}\}} \text{Withdrawal Amount}$$

$$\mathbf{Available / Withdrawable Balance} = \text{Total Gross Earned} - \left( \text{Locked Commission} + \text{Completed Payouts} + \text{Active Reserved Payouts} \right)$$

### 6.3. Concurrency Protection & Transaction Boundaries
When a user submits a withdrawal:
1. An explicit PostgreSQL database transaction begins (`SERIALIZABLE` or `READ COMMITTED` with `SELECT ... FOR UPDATE` on the user's active withdrawal queue and ledger).
2. The available balance is computed.
3. The system asserts:
   $$\text{Requested Amount} > 0$$
   $$\text{Requested Amount} \le \text{Available Balance}$$
   $$\text{Active Reserved Requests Count} = 0 \quad (\text{or below configured max})$$
4. The new `withdrawal_requests` row is inserted with status `REQUESTED`.
5. The transaction commits. Concurrent requests fail validation because the first transaction's reservation immediately reduces the computed available balance.

### 6.4. Currency and Arithmetic Precision
- Currency is explicitly tracked on every monetary row (ISO 4217 code, default `'AED'`).
- All monetary columns use PostgreSQL `DECIMAL(12, 2)` (supporting amounts up to AED 9,999,999,999.99 with exact cent precision). Floating-point representations (`FLOAT`, `DOUBLE PRECISION`) are prohibited in financial tables.
- Commission percentages are stored as integer basis points (`INT` where 100 bps = 1.00%) or `DECIMAL(5, 2)` to eliminate floating-point rounding discrepancies.

---

## 7. Compliance, Privacy, and Data Governance

1. **UAE Personal Data Protection Law (PDPL):**
   - Personal information (names, emails, phone numbers) is collected under explicit terms of service.
   - KYC documents are retained only for statutory periods and stored in UAE-compliant regional storage where required.
2. **Access Control (Principle of Least Privilege):**
   - Referral Partners can query only leads where `lead.partner_id == current_user.id`.
   - Agents can query only leads where `lead.assigned_agent_id == current_user.id`.
   - Coordinators can query leads belonging to partners/agents assigned to them.
   - Administrators have system-wide query access, with all reads and writes logged in the audit trail.
3. **Repository Cleanliness:**
   - No production dumps, seed dumps containing real PII, or credentials will be stored in this codebase.
