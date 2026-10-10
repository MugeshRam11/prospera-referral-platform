# Open Business Decisions & Policy Questions

**Document Version:** 1.0.0  
**Status:** Open for Stakeholder Review (Phase 2)  
**Target:** Prospera Referral Platform Stakeholders & Client Management  
**Reference Baseline:** [`docs/existing-platform-audit.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/existing-platform-audit.md)  
**Architecture Reference:** [`docs/target-architecture.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/target-architecture.md)

---

## 1. Executive Summary

During Phase 2 database design and architecture analysis, several critical business rules, financial policies, and governance decisions were identified that require formal client confirmation before backend implementation begins in Phase 3.

The legacy Odoo system had hardcoded assumptions, missing checks, or conflicting formulas (such as opposite signs in withdrawal calculations and double-crediting on lead edits). To ensure financial accuracy and regulatory compliance, the following items must be resolved with business stakeholders.

---

## 2. Commission Engine & Financial Policies

### Decision 2.1: Commission Accrual Timing & Clearance Hold
- **Legacy Behavior:** Commission was credited immediately to `ref.statement` as soon as the lead was moved to the `Won` stage in Odoo CRM.
- **Risk:** If a client lead signs a contract but payment defaults, or if the deal is cancelled during a statutory cooling-off period, the partner may have already withdrawn the commission.
- **Options for Confirmation:**
  - **Option A (Immediate):** Commission becomes `AVAILABLE` immediately upon lead transition to `WON`.
  - **Option B (Holding Period - Recommended):** Commission enters `PENDING_CLEARANCE` for a defined holding period (e.g., 14 days or 30 days) before automatically becoming `AVAILABLE` for withdrawal.
  - **Option C (Manual Payment Milestones):** Commission is only accrued when an administrator logs an actual client deposit or settlement transaction against the lead.
- **Client Confirmation Needed:** Which clearance policy applies, and what is the standard holding period?

---

### Decision 2.2: Commission Splits & Rate Hierarchy
- **Legacy Behavior:** Rates were inconsistently split across `res.config.settings`, `ref.target`, and hardcoded in controller logic.
- **Questions for Confirmation:**
  1. What is the authoritative commission split between Referral Partner and Sales Agent across different service categories (e.g., Real Estate, Mortgages, Business Setup)?
  2. If a customized commission rate is negotiated for an enterprise partner, does the custom partner rate override the entire deal or does it reduce the agent's share?
  3. Are commission rates strictly percentage-based (e.g., 2.0% of deal value), or are flat-fee commissions supported?

---

### Decision 2.3: Commission Reversals, Cancellations & Negative Balances
- **Legacy Behavior:** No mechanism existed to handle cancelled deals, chargebacks, or refunds after a lead was marked `Won`.
- **Options for Confirmation:**
  - **Policy A (Debit Ledger Entry):** Post a negative `REVERSAL` entry to the partner's ledger. If the partner's available balance is insufficient, their balance becomes negative, and future commissions offset the debt.
  - **Policy B (Hold & Clawback Escrow):** Maintain a rolling 5% or 10% reserve from payouts to absorb adjustments.
- **Client Confirmation Needed:** What is the legal and operational policy for commission clawbacks on defaulted deals?

---

## 3. Withdrawal & Payout Governance

### Decision 3.1: Minimum & Maximum Withdrawal Thresholds
- **Legacy Behavior:** No minimum or maximum withdrawal validation existed (`user_bill` accepted any positive float).
- **Proposed Governance:**
  - Minimum withdrawal amount: **AED 500** (to avoid excessive bank processing fees on micro-transfers).
  - Maximum single withdrawal limit: e.g., **AED 50,000** per request (higher amounts require additional two-tier administrative sign-off).
- **Client Confirmation Needed:** Approve or specify the minimum and maximum withdrawal limits.

---

### Decision 3.2: Concurrent Withdrawal Processing Policy
- **Legacy Behavior:** Allowed multiple open bills simultaneously, leading to race conditions and potential overdrawing of accounts (Audit Defect R8).
- **Options for Confirmation:**
  - **Option A (Single Active Request - Recommended):** A partner may only have **one** pending/processing withdrawal request at a time. A new request can only be submitted once the previous one is `PAID` or `REJECTED`.
  - **Option B (Multiple Requests with Real-Time Lock):** A partner may submit multiple requests, provided the sum of all pending requests plus the new request does not exceed the available balance.
- **Client Confirmation Needed:** Confirm whether single-active or multi-active withdrawal requests are preferred.

---

### Decision 3.3: Payout Disbursement Methods & Transfer Fee Handling
- **Questions for Confirmation:**
  1. What payment methods are used for disbursements? (UAE Local IBAN / WPS / International SWIFT / Cheque / Exchange House).
  2. Does Prospera absorb bank transaction fees, or is a flat transfer fee (e.g., AED 15 for local, AED 50 for international) deducted from the disbursed amount?
  3. What is the target SLA for payout processing (e.g., 3 to 5 UAE business days)?

---

## 4. User Onboarding, Roles & Compliance (KYC)

### Decision 4.1: Agent and Coordinator Provisioning
- **Legacy Behavior:** Public signup allowed callers to pass `role: 'admin'`, `'agent'`, or `'coordinate'` directly in the request body (Critical Audit Risk R1).
- **Target Policy:**
  - Public signup is restricted strictly to `REFERRAL_PARTNER`.
  - Are Sales Agents and Coordinators created exclusively by Administrators in the backoffice, or is there an invitation link workflow?
- **Client Confirmation Needed:** Confirm that internal staff (Agents, Coordinators) are provisioned exclusively by Administrators.

---

### Decision 4.2: Mandatory KYC Requirements & Lead Submission Gate
- **Questions for Confirmation:**
  1. What specific documents are legally required for individual vs. corporate partners?
     - **Individuals:** Emirates ID (Front & Back), Passport with UAE Visa, Bank Statement?
     - **Corporations:** Trade License, Memorandum of Association (MOA), VAT Certificate, Bank Confirmation Letter?
  2. **Submission Gate:** Can a new partner submit leads immediately after email verification (while KYC is `PENDING_REVIEW`), or must KYC be fully approved by Admin before any lead can be created?
  3. **Payout Gate:** Is KYC approval strictly required before submitting a withdrawal request? *(Recommendation: Strict requirement to comply with UAE AML/CFT regulations).*

---

## 5. CMS & Content Architecture

### Decision 5.1: Database-Driven Relational CMS vs. Dedicated Headless CMS
- **Legacy Behavior:** Odoo acted as both the business engine and headless CMS, storing marketing banners, FAQs, team bios, and blog articles across ~20 models.
- **Options for Confirmation:**
  - **Option A (Clean Relational Tables in PostgreSQL - Included in Proposed Schema):** Store marketing content in the dedicated `cms_*` tables designed in [`docs/database-design.md`](file:///r:/AdSavvy%20LLP/prospera-referral-platform/docs/database-design.md). The Node.js Express API serves public endpoints (`/api/v1/cms/*`). Entire platform remains in a single stack without extra third-party subscriptions.
  - **Option B (Separate Headless CMS):** Migrate marketing content to Strapi, Sanity, or static MDX files in the Next.js frontend, keeping this backend focused 100% on referral, commission, and withdrawal business logic.
- **Client Confirmation Needed:** Confirm whether to proceed with Option A (single stack PostgreSQL tables) or Option B (external CMS).

---

## 6. Legacy Data Cleansing & Balance Sign-Off

### Decision 6.1: Reconciliation of Duplicated Commission Records (Audit Defect R7)
- **Problem Statement:** In the legacy Odoo database, every update to a `Won` lead generated duplicate commission statement rows. As a result, the total commission figures shown on legacy partner dashboards are artificially inflated.
- **Remediation Plan:**
  - The migration script will retain only the earliest authoritative accrual record per lead and partner.
  - This will cause historical reported balances for some partners to decrease to their mathematically correct values.
- **Client Action Required:**
  - Client management and finance must review the deduplicated ledger summary and provide formal written sign-off before historical data is loaded into the production database.

---

### Decision 6.2: User Authentication Reset on Migration
- **Problem Statement:** Legacy passwords were leaked to localStorage in plaintext (R6), and the database snapshot was stored in an unencrypted repository (R9).
- **Remediation Plan:**
  - All existing passwords will be invalidated.
  - All migrated users will be required to execute a "Forgot Password / Reset via Verified Email OTP" flow on their initial login to the new platform.
- **Client Confirmation Needed:** Approve the mandatory password reset policy for legacy users.
