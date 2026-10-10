# Database Design Specification — Prospera Referral Platform

**Document Version:** 1.0.0  
**Status:** Proposal (Phase 2)  
**Database Engine:** PostgreSQL 14+  
**ORM:** Prisma 6  
**Reference Baseline:** [`docs/existing-platform-audit.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/existing-platform-audit.md)  
**Architectural Blueprint:** [`docs/target-architecture.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/target-architecture.md)

---

## 1. Overview & Data Modeling Objectives

This document specifies the target PostgreSQL relational schema for the Prospera Referral Platform. The design replaces the legacy Odoo 17 data structures (`res.users`, `crm.lead`, `ref.statement`, `account.move`, and assorted CMS tables) with a normalized, secure, type-safe, and ledger-based architecture.

### Core Objectives:
1. **Mathematical Financial Integrity:** Commission accruals and withdrawal records are append-only ledger entries. Balances are derived by immutable queries rather than fragile mutable columns.
2. **Strict Identity & Access Boundaries:** Normalized role enums, cryptographically hashed sessions and OTPs, and strict foreign keys governing coordinator/partner/agent relationships.
3. **Compliance & Privacy by Design:** Zero storage of binary documents in database rows; bank details encrypted; explicit audit logging for administrative mutations.
4. **Relational Rigor:** Fixed-precision decimal monetary values (`DECIMAL(12, 2)`), compound unique constraints enforcing idempotency, explicit foreign key cascade/restrict rules, and strategic B-tree indexes.

---

## 2. Entity-Relationship Overview

```
                        ┌──────────────────┐
                        │      users       │◄───────────────────────────┐
                        └────────┬─────────┘                            │
                                 │ 1:N                                  │
         ┌───────────────────────┼───────────────────────┬──────────────┼───────────────────────┐
         │                       │                       │              │                       │
         ▼                       ▼                       ▼              ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐ ┌─────────┐         ┌───────────────┐
│    sessions     │     │ otp_challenges  │     │  bank_accounts  │ │  leads  │         │ kyc_documents │
└─────────────────┘     └─────────────────┘     └─────────────────┘ └────┬────┘         └───────────────┘
                                                                         │ 1:N
                                                         ┌───────────────┴───────────────┐
                                                         ▼                               ▼
                                              ┌─────────────────────┐         ┌─────────────────────┐
                                              │ lead_status_history │         │  commission_ledger  │
                                              └─────────────────────┘         └──────────┬──────────┘
                                                                                         │
                                                                                         │ (Aggregated into
                                                                                         │  Available Balance)
                                                                                         ▼
                                                                              ┌─────────────────────┐
                                                                              │ withdrawal_requests │
                                                                              └──────────┬──────────┘
                                                                                         │ 1:N
                                                                                         ▼
                                                                              ┌─────────────────────┐
                                                                              │    payout_events    │
                                                                              └─────────────────────┘
```

---

## 3. Entity Group Specifications

### 3.1. Identity, Authentication & Access

#### `users`
Represents all system actors across the 4 canonical roles. Replaces Odoo `res.users` and `res.partner`.
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), UNIQUE, NOT NULL, Lowercase indexed)
- `password_hash` (VARCHAR(255), NOT NULL — Argon2id or bcrypt hash)
- `full_name` (VARCHAR(255), NOT NULL)
- `phone` (VARCHAR(50), NULL)
- `role` (ENUM: `REFERRAL_PARTNER`, `AGENT`, `COORDINATOR`, `ADMIN`, NOT NULL)
- `account_status` (ENUM: `PENDING_VERIFICATION`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED`, NOT NULL, Default: `PENDING_VERIFICATION`)
- `coordinator_id` (UUID, Foreign Key ➔ `users.id`, NULL — Assigned coordinator for partners and agents)
- `company_name` (VARCHAR(255), NULL — For corporate referral partners)
- `referral_code` (VARCHAR(50), UNIQUE, NULL — Unique tracking code for partner attribution)
- `email_verified_at` (TIMESTAMPTZ, NULL)
- `kyc_verified_at` (TIMESTAMPTZ, NULL)
- `approved_at` (TIMESTAMPTZ, NULL)
- `approved_by_id` (UUID, Foreign Key ➔ `users.id`, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `UNIQUE INDEX idx_users_email (email)`
- `UNIQUE INDEX idx_users_referral_code (referral_code)`
- `INDEX idx_users_role_status (role, account_status)`
- `INDEX idx_users_coordinator_id (coordinator_id)`

#### `sessions`
Replaces the unhashed, unexpired 32-character string in Odoo `res.users.token`.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key ➔ `users.id` ON DELETE CASCADE, NOT NULL)
- `token_hash` (VARCHAR(64), UNIQUE, NOT NULL — SHA-256 hash of the bearer session token)
- `ip_address` (VARCHAR(45), NULL)
- `user_agent` (VARCHAR(512), NULL)
- `expires_at` (TIMESTAMPTZ, NOT NULL)
- `last_active_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `revoked_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `UNIQUE INDEX idx_sessions_token_hash (token_hash)`
- `INDEX idx_sessions_user_active (user_id, revoked_at, expires_at)`

#### `otp_challenges`
Eliminates hardcoded `"0000"` and enables rate-limited, single-use verification challenges.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key ➔ `users.id` ON DELETE CASCADE, NULL — Nullable for pre-signup challenges)
- `email` (VARCHAR(255), NOT NULL, Lowercase)
- `code_hash` (VARCHAR(255), NOT NULL — SHA-256 or bcrypt hash of the 6-digit random code)
- `purpose` (ENUM: `SIGNUP_VERIFICATION`, `LOGIN_2FA`, `PASSWORD_RESET`, `BANK_CHANGE`, NOT NULL)
- `attempts_count` (INT, NOT NULL, Default: 0)
- `max_attempts` (INT, NOT NULL, Default: 5)
- `expires_at` (TIMESTAMPTZ, NOT NULL — Typically issued for 10 minutes)
- `consumed_at` (TIMESTAMPTZ, NULL)
- `ip_address` (VARCHAR(45), NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_otp_email_purpose (email, purpose, consumed_at, expires_at)`

---

### 3.2. Compliance & Banking

#### `kyc_documents`
Eliminates storing base64 blobs and local filestore leaks. Stores metadata only; binary files reside in private S3/R2 object storage.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key ➔ `users.id` ON DELETE CASCADE, NOT NULL)
- `document_type` (ENUM: `EMIRATES_ID_FRONT`, `EMIRATES_ID_BACK`, `PASSPORT`, `TRADE_LICENSE`, `VAT_CERTIFICATE`, `BANK_STATEMENT`, NOT NULL)
- `file_key` (VARCHAR(512), NOT NULL — Private object storage URI / S3 key)
- `original_filename` (VARCHAR(255), NOT NULL)
- `file_size_bytes` (INT, NOT NULL)
- `mime_type` (VARCHAR(100), NOT NULL)
- `sha256_checksum` (VARCHAR(64), NOT NULL)
- `status` (ENUM: `PENDING_REVIEW`, `VERIFIED`, `REJECTED`, `EXPIRED`, NOT NULL, Default: `PENDING_REVIEW`)
- `rejection_reason` (TEXT, NULL)
- `reviewed_by_id` (UUID, Foreign Key ➔ `users.id`, NULL)
- `reviewed_at` (TIMESTAMPTZ, NULL)
- `expiry_date` (DATE, NULL — Document expiration date, e.g., Emirates ID validity)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_kyc_user_status (user_id, status)`

#### `bank_accounts`
Stores payout banking coordinates. Sensitive IBAN and SWIFT values are encrypted at rest with AES-256-GCM.
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key ➔ `users.id` ON DELETE CASCADE, NOT NULL)
- `bank_name` (VARCHAR(255), NOT NULL)
- `account_holder_name` (VARCHAR(255), NOT NULL)
- `iban_last4` (VARCHAR(4), NOT NULL)
- `encrypted_iban` (TEXT, NOT NULL — Ciphertext with IV and auth tag)
- `encrypted_swift` (TEXT, NULL — Ciphertext with IV and auth tag)
- `currency` (VARCHAR(3), NOT NULL, Default: `'AED'`)
- `is_primary` (BOOLEAN, NOT NULL, Default: TRUE)
- `is_verified` (BOOLEAN, NOT NULL, Default: FALSE)
- `verified_by_id` (UUID, Foreign Key ➔ `users.id`, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_bank_user_primary (user_id, is_primary)`

---

### 3.3. Service Catalog & Commission Rules

#### `service_categories`
- `id` (UUID, Primary Key)
- `slug` (VARCHAR(100), UNIQUE, NOT NULL)
- `name` (VARCHAR(255), NOT NULL)
- `description` (TEXT, NULL)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

#### `services`
Replaces Odoo CMS service offerings and forms.
- `id` (UUID, Primary Key)
- `category_id` (UUID, Foreign Key ➔ `service_categories.id`, NOT NULL)
- `slug` (VARCHAR(100), UNIQUE, NOT NULL)
- `name` (VARCHAR(255), NOT NULL)
- `description` (TEXT, NULL)
- `default_partner_commission_bps` (INT, NOT NULL, Default: 0 — 100 bps = 1.00%)
- `default_agent_commission_bps` (INT, NOT NULL, Default: 0)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

#### `commission_rules`
Configurable target and tier rates replacing `res.config.settings` and `ref.target`.
- `id` (UUID, Primary Key)
- `service_id` (UUID, Foreign Key ➔ `services.id`, NULL — Global if null)
- `rule_name` (VARCHAR(255), NOT NULL)
- `min_deal_value` (DECIMAL(12, 2), NOT NULL, Default: 0.00)
- `max_deal_value` (DECIMAL(12, 2), NULL)
- `partner_commission_bps` (INT, NOT NULL — Basis points)
- `agent_commission_bps` (INT, NOT NULL — Basis points)
- `valid_from` (DATE, NOT NULL)
- `valid_until` (DATE, NULL)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

---

### 3.4. Lead & Referral Pipeline

#### `leads`
Replaces extended `crm.lead`. Tracks client referrals from submission through qualification to close.
- `id` (UUID, Primary Key)
- `reference_no` (VARCHAR(32), UNIQUE, NOT NULL — Human-readable reference e.g., `REF-2026-0001`)
- `partner_id` (UUID, Foreign Key ➔ `users.id`, NOT NULL — Submitting referral partner)
- `coordinator_id` (UUID, Foreign Key ➔ `users.id`, NULL — Assigned coordinator)
- `agent_id` (UUID, Foreign Key ➔ `users.id`, NULL — Assigned sales agent)
- `service_id` (UUID, Foreign Key ➔ `services.id`, NOT NULL)
- `client_name` (VARCHAR(255), NOT NULL)
- `client_email` (VARCHAR(255), NULL)
- `client_phone` (VARCHAR(50), NOT NULL)
- `expected_deal_value` (DECIMAL(12, 2), NOT NULL — Fixed precision, not Char)
- `actual_deal_value` (DECIMAL(12, 2), NULL — Populated upon contract closure)
- `currency` (VARCHAR(3), NOT NULL, Default: `'AED'`)
- `custom_partner_commission_bps` (INT, NULL — Overrides default if negotiated)
- `custom_agent_commission_bps` (INT, NULL)
- `status` (ENUM: `DRAFT`, `SUBMITTED`, `ASSIGNED`, `CONTACTED`, `QUALIFIED`, `PROPOSAL_SENT`, `NEGOTIATION`, `WON`, `LOST`, `CANCELLED`, NOT NULL, Default: `SUBMITTED`)
- `won_at` (TIMESTAMPTZ, NULL)
- `lost_reason_id` (UUID, Foreign Key ➔ `lost_reasons.id`, NULL)
- `lost_details` (TEXT, NULL)
- `notes` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `UNIQUE INDEX idx_leads_reference_no (reference_no)`
- `INDEX idx_leads_partner_status (partner_id, status)`
- `INDEX idx_leads_agent_status (agent_id, status)`
- `INDEX idx_leads_coordinator_status (coordinator_id, status)`
- `INDEX idx_leads_created_at (created_at DESC)`

#### `lead_status_history`
Audit history of stage changes, enabling velocity analytics and SLA escalation monitoring.
- `id` (UUID, Primary Key)
- `lead_id` (UUID, Foreign Key ➔ `leads.id` ON DELETE CASCADE, NOT NULL)
- `changed_by_id` (UUID, Foreign Key ➔ `users.id`, NOT NULL)
- `previous_status` (VARCHAR(50), NULL)
- `new_status` (VARCHAR(50), NOT NULL)
- `transition_note` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_lead_history_lead (lead_id, created_at)`

#### `lost_reasons`
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255), NOT NULL)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)

---

### 3.5. Financial Ledger & Commissions

#### `commission_ledger_entries`
Replaces Odoo `ref.statement`. Corrects defect R7 (duplicate commissions on update) by introducing strict immutability, compound uniqueness, and formal entry types.
- `id` (UUID, Primary Key)
- `idempotency_key` (VARCHAR(128), UNIQUE, NOT NULL — Formatted e.g., `lead_${lead_id}_won_${recipient_id}_${entry_type}`)
- `lead_id` (UUID, Foreign Key ➔ `leads.id`, NOT NULL)
- `recipient_user_id` (UUID, Foreign Key ➔ `users.id`, NOT NULL — The partner or agent receiving credit)
- `recipient_role` (ENUM: `REFERRAL_PARTNER`, `AGENT`, NOT NULL)
- `entry_type` (ENUM: `ACCRUAL`, `ADJUSTMENT`, `REVERSAL`, `CANCELLATION`, NOT NULL)
- `status` (ENUM: `PENDING_CLEARANCE`, `AVAILABLE`, `LOCKED_DISPUTE`, `CANCELLED`, NOT NULL, Default: `AVAILABLE`)
- `deal_value` (DECIMAL(12, 2), NOT NULL)
- `commission_bps` (INT, NOT NULL — Basis points applied)
- `amount` (DECIMAL(12, 2), NOT NULL — Monetary amount in currency, positive for accrual, negative for reversal)
- `currency` (VARCHAR(3), NOT NULL, Default: `'AED'`)
- `description` (TEXT, NOT NULL)
- `created_by_id` (UUID, Foreign Key ➔ `users.id`, NULL — System or Admin user)
- `available_at` (TIMESTAMPTZ, NOT NULL, Default: NOW() — Settlement date)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `UNIQUE INDEX idx_commission_idempotency (idempotency_key)`
- `UNIQUE INDEX idx_commission_lead_recipient_type (lead_id, recipient_user_id, entry_type)`
- `INDEX idx_commission_recipient_status (recipient_user_id, status)`
- `INDEX idx_commission_created_at (created_at DESC)`

---

### 3.6. Withdrawals & Payouts

#### `withdrawal_requests`
Replaces Odoo `account.move` (`in_invoice` vendor bills). Corrects defect R8 (inconsistent math and race conditions).
- `id` (UUID, Primary Key)
- `reference_no` (VARCHAR(32), UNIQUE, NOT NULL — Human-readable e.g., `WTH-2026-0001`)
- `user_id` (UUID, Foreign Key ➔ `users.id`, NOT NULL)
- `bank_account_id` (UUID, Foreign Key ➔ `bank_accounts.id`, NOT NULL)
- `amount` (DECIMAL(12, 2), NOT NULL — Fixed-precision positive amount)
- `currency` (VARCHAR(3), NOT NULL, Default: `'AED'`)
- `status` (ENUM: `REQUESTED`, `UNDER_REVIEW`, `APPROVED`, `PROCESSING`, `PAID`, `REJECTED`, `CANCELLED`, NOT NULL, Default: `REQUESTED`)
- `user_notes` (TEXT, NULL)
- `admin_notes` (TEXT, NULL)
- `rejection_reason` (TEXT, NULL)
- `approved_by_id` (UUID, Foreign Key ➔ `users.id`, NULL)
- `approved_at` (TIMESTAMPTZ, NULL)
- `paid_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())
- `updated_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `UNIQUE INDEX idx_withdrawal_ref (reference_no)`
- `INDEX idx_withdrawal_user_status (user_id, status)`

#### `payout_events`
Audit record of financial disbursement (e.g., bank wire, UAE WPS, exchange transfer).
- `id` (UUID, Primary Key)
- `withdrawal_request_id` (UUID, Foreign Key ➔ `withdrawal_requests.id`, NOT NULL)
- `processed_by_id` (UUID, Foreign Key ➔ `users.id`, NOT NULL)
- `payout_method` (ENUM: `BANK_TRANSFER_UAE`, `INTERNATIONAL_WIRE`, `CHEQUE`, `MANUAL`, NOT NULL)
- `transaction_reference` (VARCHAR(255), NOT NULL — Bank transaction number / UTR)
- `disbursed_amount` (DECIMAL(12, 2), NOT NULL)
- `fee_deducted` (DECIMAL(12, 2), NOT NULL, Default: 0.00)
- `currency` (VARCHAR(3), NOT NULL, Default: `'AED'`)
- `executed_at` (TIMESTAMPTZ, NOT NULL)
- `receipt_file_key` (VARCHAR(512), NULL — S3 file key for payment receipt)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_payout_withdrawal (withdrawal_request_id)`
- `INDEX idx_payout_reference (transaction_reference)`

---

### 3.7. Audit & Operations

#### `audit_logs`
Immutable, write-only log for all privileged actions.
- `id` (UUID, Primary Key)
- `actor_user_id` (UUID, Foreign Key ➔ `users.id`, NULL — System or User ID)
- `action` (VARCHAR(100), NOT NULL — e.g. `USER_ROLE_UPDATED`, `KYC_APPROVED`, `WITHDRAWAL_PAID`)
- `entity_type` (VARCHAR(50), NOT NULL — e.g. `User`, `Lead`, `WithdrawalRequest`)
- `entity_id` (VARCHAR(64), NOT NULL)
- `old_values` (JSONB, NULL)
- `new_values` (JSONB, NULL)
- `ip_address` (VARCHAR(45), NULL)
- `user_agent` (VARCHAR(512), NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

**Constraints & Indexes:**
- `INDEX idx_audit_entity (entity_type, entity_id)`
- `INDEX idx_audit_actor (actor_user_id, created_at DESC)`

#### `notification_logs`
Delivery audit for transactional notifications.
- `id` (UUID, Primary Key)
- `recipient_email` (VARCHAR(255), NOT NULL)
- `template_name` (VARCHAR(100), NOT NULL)
- `subject` (VARCHAR(255), NOT NULL)
- `channel` (ENUM: `EMAIL`, `SMS`, `IN_APP`, NOT NULL, Default: `EMAIL`)
- `status` (ENUM: `SENT`, `FAILED`, `DELIVERED`, NOT NULL)
- `error_message` (TEXT, NULL)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

---

### 3.8. CMS & Marketing Content (Decoupled Relational Store)

These clean tables replace Odoo's ~35 public marketing models, making the Node.js backend completely independent of Odoo for website content.

#### `cms_banners`
- `id` (UUID, Primary Key)
- `title` (VARCHAR(255), NOT NULL)
- `subtitle` (TEXT, NULL)
- `cta_text` (VARCHAR(100), NULL)
- `cta_link` (VARCHAR(255), NULL)
- `image_url` (VARCHAR(512), NOT NULL)
- `display_order` (INT, NOT NULL, Default: 0)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

#### `cms_faqs`
- `id` (UUID, Primary Key)
- `category` (VARCHAR(100), NOT NULL, Default: `'General'`)
- `question` (TEXT, NOT NULL)
- `answer` (TEXT, NOT NULL)
- `display_order` (INT, NOT NULL, Default: 0)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)

#### `cms_posts` (Blog / News)
- `id` (UUID, Primary Key)
- `slug` (VARCHAR(255), UNIQUE, NOT NULL)
- `title` (VARCHAR(255), NOT NULL)
- `summary` (TEXT, NULL)
- `content_html` (TEXT, NOT NULL)
- `cover_image_url` (VARCHAR(512), NULL)
- `author_name` (VARCHAR(255), NOT NULL)
- `published_at` (TIMESTAMPTZ, NULL)
- `is_published` (BOOLEAN, NOT NULL, Default: FALSE)
- `created_at` (TIMESTAMPTZ, NOT NULL, Default: NOW())

#### `cms_team_members`
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255), NOT NULL)
- `designation` (VARCHAR(255), NOT NULL)
- `bio` (TEXT, NULL)
- `photo_url` (VARCHAR(512), NULL)
- `display_order` (INT, NOT NULL, Default: 0)
- `is_active` (BOOLEAN, NOT NULL, Default: TRUE)

---

## 4. Financial Calculation Engine & Concurrency Design

### 4.1. Single Authoritative Balance Query
To resolve legacy defect R8 permanently, the database view or ORM aggregation strictly executes:

```sql
SELECT
  -- 1. Total Earned (Available + Locked Accruals minus Reversals)
  COALESCE(SUM(CASE 
    WHEN entry_type = 'ACCRUAL' AND status IN ('AVAILABLE', 'LOCKED_DISPUTE') THEN amount
    WHEN entry_type IN ('REVERSAL', 'CANCELLATION') THEN amount -- negative value
    ELSE 0
  END), 0) AS total_gross_commission,

  -- 2. Currently Withdrawable Earned Amount
  COALESCE(SUM(CASE 
    WHEN entry_type = 'ACCRUAL' AND status = 'AVAILABLE' AND available_at <= NOW() THEN amount
    WHEN entry_type IN ('REVERSAL', 'CANCELLATION') THEN amount
    ELSE 0
  END), 0) AS available_accrued_commission

FROM commission_ledger_entries
WHERE recipient_user_id = :user_id;
```

Combined with the user's withdrawal summary:
```sql
SELECT
  -- Paid Withdrawals
  COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS total_paid_withdrawals,

  -- Active Pending / Reserved Withdrawals
  COALESCE(SUM(CASE WHEN status IN ('REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'PROCESSING') THEN amount ELSE 0 END), 0) AS pending_reserved_withdrawals

FROM withdrawal_requests
WHERE user_id = :user_id;
```

$$\mathbf{Net\ Available\ For\ Withdrawal} = \text{available\_accrued\_commission} - (\text{total\_paid\_withdrawals} + \text{pending\_reserved\_withdrawals})$$

### 4.2. Concurrency Protection Mechanism
When processing a withdrawal request:
1. Wrap inside an interactive Prisma database transaction (`prisma.$transaction(async (tx) => { ... })`).
2. Lock the user's active withdrawal records or bank account record via `FOR UPDATE` to serialize concurrent requests.
3. Compute the net available balance within the transaction.
4. Verify:
   - `amount >= MINIMUM_WITHDRAWAL_AMOUNT`
   - `amount <= net_available`
   - `pending_reserved_withdrawals == 0` (or below policy ceiling)
5. Insert `withdrawal_requests` row.
6. Commit transaction.
Any simultaneous request that attempted to check balance during this window is blocked until commit, at which point its computed `pending_reserved_withdrawals` includes the first request, safely failing the assertion.
