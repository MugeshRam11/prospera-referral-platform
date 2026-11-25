# Prospera Referral Platform — Beta Readiness Checklist

**Target Beta Date:** Saturday, 28 November 2026  
**Branch:** `feat/antigravity-beta-sprint`

## 1. Git & Source Integrity
- [x] Dedicated implementation branch created from verified feature state (`8b49a49`)
- [x] Tracked `frontend/.next-backup-20261125-165153/` removed from git index and ignored in `frontend/.gitignore`
- [x] Codex notification branch (`codex/referral-email-notifications`) files untouched

## 2. Database & Migrations
- [x] Additive, non-destructive migration `prisma/migrations/20261125120000_beta_sprint_foundations/migration.sql`
- [ ] Run `npx prisma migrate deploy` on isolated beta database before launch
- [ ] Verify 7-role demo accounts & passwords preserved without reset/reseed

## 3. Security, Authorization & Governance
- [x] Seven-role authorization enforced on backend routes (`ADMIN`, `COORDINATOR`, `REFERRAL_PARTNER`, `AGENT` independent & agency roles)
- [x] Client consent declaration required before referral submission and before CRM DTO mapping
- [x] Protected private document storage architecture (no public object URLs, no sensitive KYC docs sent to CRM)
- [x] 5 draft legal document categories versioned & tracked (`GOVERNANCE_POLICY`, `DATA_PROTECTION_POLICY`, `REFERRAL_TERMS`, `PRIVACY_POLICY`, `REFERRAL_PARTNER_AGREEMENT`) marked `PENDING_LEGAL_REVIEW`

## 4. Service Catalogue, CRM & Property Controls
- [x] Hierarchical service catalogue with Free Zone packages (`zero-visa`, `one-visa`, `two-visas`, `multi-visa-custom`)
- [x] Typed structured referral schemas (`REAL_ESTATE`, `GOLDEN_VISA`, `MORTGAGE`, `COMPANY_FORMATION`, `CORPORATE_ADVISORY`)
- [x] Leadrat CRM adapter with idempotency keys, exponential backoff retry queue, and HMAC webhook verification (dormant until `LEADRAT_API_URL`, `LEADRAT_API_KEY`, and `LEADRAT_WEBHOOK_SECRET` are provisioned)
- [x] Property inventory publishing boundary (`IMPORTED → PENDING_REVIEW → APPROVED → PUBLISHED`, plus `REJECTED`, `UNPUBLISHED`, `ARCHIVED`)
- [x] Admin commission rules endpoint (`/api/v1/admin/commission-rules`) with rule versioning and audit logging

## 5. Email & External Dependencies (Pre-Beta Action Items)
- [ ] Merge/coordinate `codex/referral-email-notifications` after review
- [ ] Provision SMTP/domain email credentials and validate SPF, DKIM, DMARC
- [ ] Provision Leadrat OpenAPI spec and sandbox credentials to transition CRM sync from `PENDING_CONFIGURATION` to sandbox-verified
- [ ] Provision isolated beta environment & database (do not expose private presenter preview publicly)
