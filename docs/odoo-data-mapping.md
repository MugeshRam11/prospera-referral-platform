# Odoo 17 to Target PostgreSQL Data Mapping Specification

**Document Version:** 1.0.0  
**Status:** Proposal (Phase 2)  
**Source Platform:** Odoo 17.0 (`Referral-Odoo` custom module + PostgreSQL dump `tgh_ref_dev`)  
**Target Platform:** Prospera Referral Platform (PostgreSQL 14+ via Prisma)  
**Reference Baseline:** [`docs/existing-platform-audit.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/existing-platform-audit.md)  
**Schema Specification:** [`docs/database-design.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/database-design.md)

---

## 1. Executive Summary & Migration Scope

The legacy backend relies on Odoo 17 models extended by `Referral-Odoo`. The database snapshot (`dump.sql`) contains:
- 37 user records (`res.users`)
- 45 CRM leads / referrals (`crm.lead`)
- 162 commission statement rows (`ref.statement`)
- 49 account moves / vendor bills (`account.move`)
- 129 KYC document attachments (`res.users.docs` / `ir.attachment`)
- Marketing and CMS records across ~20 models.

This document defines the field-level transformation rules, data cleaning requirements, type conversions, and validation scripts needed to extract, transform, and load (ETL) data from Odoo 17 into the clean PostgreSQL schema.

---

## 2. Model Mapping Matrix

| Odoo 17 Source Model | Target Entity (PostgreSQL) | Primary Transformation / Key Considerations |
|---|---|---|
| `res.users` + `res.partner` | `users` | Split roles into canonical enum; reset invalid/plaintext tokens; map coordinator FK. |
| `res.users` (bank fields) | `bank_accounts` | Extract IBAN, SWIFT, Bank Name; encrypt IBAN/SWIFT at rest; isolate from user profile. |
| `res.users.docs` + `ir.attachment` | `kyc_documents` | Migrate metadata; copy binary files from 808 MB filestore into private S3 buckets. |
| `crm.lead` | `leads` | Map stages to enum; convert `expected_budget` string to `DECIMAL(12, 2)`; map partner & agent FKs. |
| `ref.statement` | `commission_ledger_entries` | **Critical deduplication (R7)**; map to idempotent immutable ledger accruals. |
| `account.move` (`type='in_invoice'`) | `withdrawal_requests` + `payout_events` | Map vendor bills to withdrawal requests; resolve sign discrepancy (R8); map payment state to status. |
| `ref.service` / `ref.form.*` | `services` + `service_categories` | Structure CMS services into relational catalog with default commission bps. |
| `res.config.settings` / `ref.target` | `commission_rules` | Extract target percentages and tier rules into declarative configuration rows. |
| `ref.banner` | `cms_banners` | Direct field mapping; normalize asset URLs. |
| `ref.faq` | `cms_faqs` | Direct field mapping. |
| `ref.blog` | `cms_posts` | Direct field mapping; parse and sanitize HTML content. |
| `ref.team` | `cms_team_members` | Direct field mapping; normalize asset URLs. |

---

## 3. Detailed Entity Transformations

### 3.1. Users and Profiles

**Source Models:** `res.users` joined with `res.partner` on `res.users.partner_id = res.partner.id`  
**Target Entity:** `users`

| Odoo Source Field | Target Field | Data Type Conversion | Transformation & Validation Rules |
|---|---|---|---|
| `res.users.id` | *(Legacy mapping)* | `INT` ➔ `UUID` | Generated target UUID; store `odoo_user_id` in migration lookup table. |
| `res.users.login` | `email` | `VARCHAR` ➔ `VARCHAR(255)` | Lowercase, trim, validate email format. Must be unique. |
| `res.partner.name` | `full_name` | `VARCHAR` ➔ `VARCHAR(255)` | Trim whitespace; default to login prefix if null. |
| `res.partner.phone` / `mobile` | `phone` | `VARCHAR` ➔ `VARCHAR(50)` | Sanitize to E.164 format where valid. |
| `res.users.role` | `role` | `Selection` ➔ `Role` ENUM | Map `'admin'` ➔ `ADMIN`, `'coordinate'` ➔ `COORDINATOR`, `'agent'` ➔ `AGENT`, `'referral_partner'` ➔ `REFERRAL_PARTNER`. If null, default to `REFERRAL_PARTNER`. |
| `res.users.active` | `account_status` | `BOOLEAN` ➔ `AccountStatus` ENUM | If `active = true` ➔ `ACTIVE`. If `active = false` ➔ `SUSPENDED` or `PENDING_APPROVAL`. |
| `res.users.my_coordinate` | `coordinator_id` | `Many2one` ➔ `UUID` | Resolve Odoo partner/user ID to target UUID for coordinator. |
| `res.partner.company_name` | `company_name` | `VARCHAR` ➔ `VARCHAR(255)` | Direct copy. |
| `res.users.password` | `password_hash` | `VARCHAR` ➔ `VARCHAR(255)` | Legacy Odoo passwords use PBKDF2/SHA512. **Rule:** Flag all migrated users for password reset via email OTP on first login. |
| `res.users.create_date` | `created_at` | `TIMESTAMP` ➔ `TIMESTAMPTZ` | Convert UTC timestamp. |

**Discarded / Scrubbed Odoo Fields:**
- `res.users.token`: Legacy plaintext 32-character tokens are discarded; users must re-authenticate.
- `res.users.otp`: Discarded.
- `res.users.total_commission`, `total_withdraw`, `total_pending`: Discarded; replaced by live ledger computations.

---

### 3.2. Bank Accounts

**Source Model:** `res.users` (bank columns)  
**Target Entity:** `bank_accounts`

| Odoo Source Field | Target Field | Transformation Rules |
|---|---|---|
| `res.users.bank_name` | `bank_name` | Trim; default to `'Unknown Bank'` if blank. |
| `res.users.account_holder_name` | `account_holder_name` | Fallback to `res.partner.name` if blank. |
| `res.users.iban` / `account_number` | `encrypted_iban`, `iban_last4` | Extract last 4 alphanumeric characters into `iban_last4`. Encrypt full string using AES-256-GCM. |
| `res.users.swift_code` | `encrypted_swift` | Encrypt full string using AES-256-GCM. |
| Constant | `currency` | Default to `'AED'`. |
| Constant | `is_primary` | Set `true`. |
| Constant | `is_verified` | Set `true` if user has completed historical payouts. |

---

### 3.3. KYC Documents

**Source Models:** `res.users.docs` and `ir.attachment` linked to user partners  
**Target Entity:** `kyc_documents`

| Odoo Source Field | Target Field | Transformation Rules |
|---|---|---|
| `res.users.docs.id` | *(Legacy mapping)* | Map to target UUID via lookup table. |
| `res.users.docs.user_id` | `user_id` | Foreign key to target `users.id`. |
| `res.users.docs.name` / doc type | `document_type` | Map to `EMIRATES_ID_FRONT`, `EMIRATES_ID_BACK`, `PASSPORT`, `TRADE_LICENSE`, `VAT_CERTIFICATE`. |
| `ir.attachment.store_fname` | `file_key` | **File Migration:** Locate file in 808 MB filestore, calculate SHA-256 checksum, upload to private S3 bucket under `kyc/{user_id}/{uuid}.ext`. Store S3 key. |
| `ir.attachment.name` | `original_filename` | Direct copy. |
| `ir.attachment.file_size` | `file_size_bytes` | Store integer bytes. |
| `ir.attachment.mimetype` | `mime_type` | Normalize MIME string. |
| Computed | `sha256_checksum` | Compute on binary stream before S3 upload. |
| `res.users.docs.status` | `status` | Map `'approved'` ➔ `VERIFIED`, `'rejected'` ➔ `REJECTED`, `'pending'` ➔ `PENDING_REVIEW`. |

---

### 3.4. CRM Leads and Referral Pipeline

**Source Model:** `crm.lead`  
**Target Entity:** `leads`

| Odoo Source Field | Target Field | Transformation Rules |
|---|---|---|
| `crm.lead.id` | *(Legacy mapping)* | Map to target UUID. |
| `crm.lead.name` | `reference_no` | Format as `REF-ODOO-{id}` or generate clean alphanumeric reference. |
| `crm.lead.partner_id` / `ref_partner_id` | `partner_id` | Resolve to target UUID of referral partner. |
| `crm.lead.user_id` | `agent_id` | Salesperson in Odoo maps to assigned `agent_id`. |
| `crm.lead.service_id` | `service_id` | Map to corresponding target `services.id`. |
| `crm.lead.contact_name` | `client_name` | Direct copy. |
| `crm.lead.email_from` | `client_email` | Trim and validate. |
| `crm.lead.phone` / `mobile` | `client_phone` | Sanitize to valid phone string. |
| `crm.lead.expected_budget` | `expected_deal_value` | **Type Correction:** Odoo stored this as `Char` containing text. Clean regex `[^0-9.]`, parse as `DECIMAL(12, 2)`. If unparseable, log error and flag. |
| `crm.lead.stage_id` | `status` | Map Odoo stage names: `'New'` ➔ `SUBMITTED`, `'Assigned'` ➔ `ASSIGNED`, `'Qualified'` ➔ `QUALIFIED`, `'Won'` ➔ `WON`, `'Lost'` ➔ `LOST`. |
| `crm.lead.date_closed` | `won_at` | Set if stage is won. |
| `crm.lead.lost_reason_id` | `lost_reason_id` | Map to target `lost_reasons.id`. |
| `crm.lead.description` | `notes` | HTML stripped / formatted to plain text. |

---

### 3.5. Commission Statements (Crucial Deduplication)

**Source Model:** `ref.statement`  
**Target Entity:** `commission_ledger_entries`

#### Defect R7 Remediation (Duplicate Commission Elimination):
In the legacy codebase, every write to a Won lead generated duplicate `ref.statement` records for partner and agent. In the snapshot DB (162 statement rows for only 45 leads), duplicate rows are highly prevalent.

**Deduplication and Cleansing Algorithm:**
1. Group all `ref.statement` records by `(lead_id, partner_id)`.
2. Inspect creation timestamps and amounts.
3. If multiple identical records exist for the same lead and partner:
   - Retain the earliest record as the authoritative `ACCRUAL`.
   - Log discarded duplicate statement IDs into a migration report (`docs/migration-audit-duplicates.json`).
4. Generate the target `idempotency_key`: `lead_${target_lead_id}_won_${target_recipient_id}_ACCRUAL`.
5. Map:
   - `amount` ➔ `amount` (`DECIMAL(12, 2)`)
   - `status` ➔ `AVAILABLE`
   - `entry_type` ➔ `ACCRUAL`
   - `deal_value` ➔ `leads.expected_deal_value`
   - `commission_bps` ➔ Derived from `(amount / deal_value) * 10000`

---

### 3.6. Withdrawals and Vendor Bills

**Source Model:** `account.move` where `move_type = 'in_invoice'`  
**Target Entity:** `withdrawal_requests` and `payout_events`

#### Defect R8 Remediation (Math and Sign Discrepancies):
Odoo vendor bills represented partner withdrawal requests.
- `account.move.amount_total`: Positive withdrawal amount.
- `account.move.state`:
  - `'draft'` ➔ `status = REQUESTED`
  - `'posted'` with `payment_state = 'not_paid'` ➔ `status = APPROVED`
  - `'posted'` with `payment_state = 'in_payment'` ➔ `status = PROCESSING`
  - `'posted'` with `payment_state = 'paid'` ➔ `status = PAID`
  - `'cancel'` ➔ `status = CANCELLED`
- For records where `status = PAID`:
  - Create a corresponding `payout_events` record with `executed_at = account.move.invoice_date` and `disbursed_amount = account.move.amount_total`.

---

### 3.7. CMS Marketing Content

| Source Odoo Model | Target Table | Mapping Rules |
|---|---|---|
| `ref.banner` | `cms_banners` | Map `name`, `subtitle`, `image` ➔ `image_url`, `sequence` ➔ `display_order`. |
| `ref.faq` | `cms_faqs` | Map `question`, `answer`, `category`. |
| `ref.blog` | `cms_posts` | Map `name` ➔ `title`, `content` ➔ `content_html`, `author`, `date` ➔ `published_at`. Clean Odoo-specific asset URLs. |
| `ref.team` | `cms_team_members` | Map `name`, `designation`, `bio`, `image` ➔ `photo_url`. |

---

## 4. Migration Execution Plan (ETL Stages)

```
[Phase A: Extraction]
  │  Read Odoo 17 PostgreSQL tables using read-only SQL scripts (dump.sql instance)
  ▼
[Phase B: Sanitation & Deduplication]
  │  - Deduplicate ref.statement rows per lead & partner
  │  - Strip non-numeric characters from expected_budget
  │  - Normalize emails and phone numbers
  ▼
[Phase C: Security & Asset Migration]
  │  - Encrypt IBAN/SWIFT values with AES-256-GCM
  │  - Extract 129 KYC files from filestore and upload to private S3
  │  - Generate SHA-256 checksums
  ▼
[Phase D: Database Loading & Reconciliation]
  │  - Load users, categories, services, leads into PostgreSQL
  │  - Insert idempotent commission ledger entries
  │  - Insert withdrawal requests
  │  - Validate: Recomputed available balance MUST equal audited partner statements
  ▼
[Phase E: Verification Sign-Off]
  │  Produce reconciliation ledger for client approval before go-live
```

---

## 5. Unresolved Questions & Data Risks Requiring Confirmation

1. **Password Migration vs. Forced Reset:** Because Odoo passwords use internal hashes and the audit confirmed credentials were leaked to localStorage (R6), we strongly recommend **forcing all users to reset passwords via verified email OTP** upon first login.
2. **Duplicate Statement Balance Reconciliation:** When duplicate `ref.statement` rows are purged, some partner balances will decrease compared to the inflated numbers shown on the legacy dashboard. Client management must sign off on the cleaned balance ledger.
3. **Missing `good_home` Module:** If any CRM leads in the database dump depend on models or columns introduced by `good_home`, those custom fields will be omitted unless source definitions are provided.
