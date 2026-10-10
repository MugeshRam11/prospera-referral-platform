# Existing Platform Audit — Referral Platform

**Scope:** `siddiqmomin/Referral-FE` (Next.js frontend) and `siddiqmomin/Referral-BE` (Odoo 17 addon + DB snapshot)
**Method:** Read-only static review of a shallow clone of each repo's default branch (one commit each). Nothing was run, built, or modified. Findings marked **[verify]** are inferred from code and need confirmation against a running instance.
**Status:** Discovery only. No file changes authorized.

---

## 1. Executive summary

The platform is a referral/commission portal for a UAE-facing business (Referral.ae). Referral partners submit leads, coordinators assign them to agents, agents work them in Odoo CRM, and commission is paid out via vendor bills when a lead is marked Won.

- **Frontend:** Next.js 14 App Router + TypeScript + Tailwind, 29 pages, ~316 TS/TSX files. Reasonable page/component separation, but heavy dependency overlap and client-side auth.
- **Backend:** a single custom Odoo 17 module (`Referral-Odoo`) exposing **135 JSON-RPC routes**, ~9.5k lines of Python, 44 controller files. It doubles as a headless CMS (home page, about, FAQ, blog, footer, team) and as the business engine (users, KYC, leads, commission, withdrawals).
- **Overall verdict:** the **UI shell and the Odoo data model are reusable**. The **API/auth layer is not safe to carry forward** and should be rebuilt. Several defects directly affect money (duplicate commission rows, inconsistent withdrawal math).

### Top risks (detail in §7)

| # | Risk | Severity |
|---|------|----------|
| R1 | Signup accepts a client-supplied `role` (including `admin`) | Critical |
| R2 | OTP hard-coded to `"0000"` in signup, login, and social login | Critical |
| R3 | Google login trusts a client-supplied `email`, not the verified token's email | Critical |
| R4 | All 135 routes are `auth="public"` with `cors="*"`; authorization is hand-rolled per endpoint | High |
| R5 | Session token never expires, is stored in plaintext, compared with `==` | High |
| R6 | Plaintext password persisted to browser localStorage (redux-persist) | High |
| R7 | Commission rows duplicated on every write to a Won lead | High (financial) |
| R8 | Withdrawal eligibility math is inconsistent between two endpoints | High (financial) |
| R9 | Repo contains a production-like DB dump, 808 MB filestore with KYC docs, and an SMTP credential | High (compliance) |
| R10 | `good_home` module is installed in the DB but its source is not in the repo | Medium |

---

## 2. Repository layout

### Referral-BE
```
README                         (2 lines: restore instructions)
Referral-Odoo/                 custom Odoo addon (technical name "Referral-Odoo")
  __manifest__.py              depends: base, mail, mass_mailing, crm, contacts, account
  controllers/                 44 .py files, 135 routes
    admin_dashboard/ dashboard/ forms/ home/
  models/                      ~20 model files (home/, form/ subfolders)
  data/                        31 XML files (seed content + 20ish mail templates)
  views/                       39 XML files (all manifest entries exist on disk)
  security/ir.model.access.csv 72 ACL models
  static/src/img
tgh_ref_dev_2025-08-20_07-33-22/
  dump.sql (50 MB), manifest.json, filestore/ (808 MB)
```
Database snapshot: Odoo **17.0**, PostgreSQL 14, db name `tgh_ref_dev`, dated 2025-08-20, **81 installed modules** (includes `website`, `website_sale`, `sale_crm`, `l10n_ae`, `mass_mailing`, `good_home`).

### Referral-FE
```
app/            App Router pages (29), app/api/auth (NextAuth), app/redux
apis/           17 thin fetch wrappers, one per domain, built on apis/APICore.tsx
components/     ClientSide / ServerSide / Admin / Agent / Coordinator / SuperAdmin / Common
InterfaceTypes/ TS types
public/         static assets
```
Runs on port **3003**. No `middleware.ts`, no `.env.example`, no tests, README is the unmodified create-next-app text.

---

## 3. Current architecture

```
Browser (Next.js 14, Redux+persist, NextAuth/Google)
   │  JSON-RPC 2.0 over POST  { jsonrpc, params:{...} }   (apis/APICore.tsx)
   ▼
Odoo 17  — custom controllers (type="json", auth="public", cors="*")
   │  request.env[...].sudo()   (409 sudo() calls)
   ▼
Odoo ORM → PostgreSQL + filestore
   ├─ crm.lead (extended)            referrals
   ├─ res.users (extended)           all 4 roles + bank details + token + OTP
   ├─ ref.statement                  commission ledger rows
   ├─ account.move (in_invoice)      withdrawal = vendor bill
   └─ many CMS-style models           banner, faq, services, teams, blog, footer…
SMTP via ir.mail_server → OTP, won, rejection, newsletter templates
```

**Roles** (`res.users.role`): `agent`, `coordinate`, `referral_partner`, `admin`. All are Odoo *portal* users; the role is an application-level field, not an Odoo security group.

**Core business flow**
1. Partner/agent signs up (`/api/ref/create_user/`) with KYC docs → email OTP → account activated.
2. Admin validates docs and assigns a coordinator (`my_coordinate`).
3. Partner creates a referral (`/api/referral/create`) → `crm.lead` with service, budget, commission percentages.
4. Coordinator assigns an agent; agent moves lead through CRM stages; lost reasons and escalation supported.
5. Stage `is_won` → `ref.statement` rows credit partner and agent; totals roll up onto `res.users`.
6. User requests a withdrawal (`/api/user/bill`) → Odoo vendor bill; when posted, `total_withdraw`/`total_pending` update via `account.move.write`.

**Auth model (as built):** password → `session.authenticate` → OTP email → `login/confirmation` returns a 32-char random token stored in `res.users.token`. The FE sends `user_id` + `token` in the body of every call. Google login goes through NextAuth, then calls `/api/ref/social_login`.

---

## 4. Reusable features

| Area | Where | Reuse assessment |
|------|-------|------------------|
| Role-based dashboards (admin, coordinator, agent, partner) incl. charts, tables, exports | `app/dashboard/*`, `components/*SeprateComponents` | **Reuse UI**; re-point to a new API. Large components (500–650 lines) should be split during port. |
| Lead tracking / referral pipeline views, status filters, lost reasons | `track-referrals`, `lead-tracking-dashboard` | Reuse UI + status taxonomy |
| Signup with KYC upload, multi-step forms, validation (react-hook-form) | `SignUpFormComponent.tsx` | Reuse form structure; replace upload mechanism |
| Public marketing site (home, about, services, FAQ, blog, team, contact, T&C, privacy, commission structure) | `app/*`, `ServerSideComponents` | Reuse; content currently comes from Odoo CMS endpoints |
| Excel export endpoints | `/api/*/excel`, `*_export` | Reuse the report definitions, not the implementation (JSON-RPC returning file data) |
| Commission configuration (agent %, partner %, targets, escalation hours, lost-lead limit) | `res.config.settings` | **Reuse concept**; keep as configurable settings |
| Odoo data model: lead extensions, `ref.statement`, `ref.escalation`, service/range/target models | `models/` | **Reuse after fixes** (see R7, R8) |
| Email templates (OTP, won, rejection, referral created, doc verify, newsletter) | `data/*.xml` | Reuse copy; remove hard-coded host (see §6) |
| Seed content and real production-shaped data | `dump.sql`, `filestore` | Reference only; treat as sensitive |

---

## 5. Rebuild requirements

These need to be rebuilt or substantially redesigned rather than ported.

1. **Authentication & session layer.** Replace the custom token with a standard mechanism (Odoo API keys/OAuth2 or an external IdP issuing JWTs). Requirements: expiry, rotation, logout/revocation, hashed storage, rate-limited OTP with random codes, MFA on privileged roles.
2. **Authorization.** Central, deny-by-default enforcement (role + ownership) instead of per-endpoint checks. Stop using `.sudo()` as the default; use record rules and ACLs.
3. **Signup/onboarding.** Server decides role; admin approval gate; remove password re-write on existing inactive accounts; rate limits.
4. **Commission & payout engine.** Idempotent, single source of truth (ledger-based), one formula for "withdrawable", transactional creation of bills, guard against concurrent requests.
5. **Document/KYC handling.** Upload via multipart or signed URLs with size/type limits, antivirus, encrypted at rest, restricted access; no base64-in-JSON.
6. **Sensitive data.** Encrypt or tokenise bank details (IBAN, SWIFT); minimise retention; audit-log access.
7. **API contract.** Versioned REST (or at least stable JSON schema) with typed errors; the current `apiCore` swallows errors and returns `undefined`.
8. **Frontend session handling.** Server-side session (NextAuth with API-backed credentials or httpOnly cookies), route protection via `middleware.ts`, never persist credentials.
9. **Environment and delivery.** `.env.example`, secrets management, CI (lint/type-check/build), tests for commission and auth flows, and a documented install path for the Odoo module.
10. **Headless CMS decision.** Decide whether marketing content stays in Odoo (current) or moves to a CMS; many of the ~76 Odoo models appear to exist only to serve static marketing sections (not individually counted).

---

## 6. Dependencies

### Frontend (package.json)
- **Core:** next ^14.2.28, react 18, typescript 5, tailwindcss 3.4, @reduxjs/toolkit, redux-persist, next-auth ^4.24, react-hook-form, axios.
- **Redundant overlap (cleanup candidates):**
  - Charts ×4: apexcharts/react-apexcharts, chart.js/react-chartjs-2 (+zoom plugin), recharts, jsvectormap
  - Toasts ×2: react-hot-toast, react-toastify
  - Phone input ×2 (+ inputmask, react-hook-mask): react-phone-input-2, react-phone-number-input
  - Drag-and-drop ×2: @dnd-kit, react-beautiful-dnd (the latter is deprecated and unmaintained)
  - Carousels ×3: react-slick/slick-carousel, swiper
  - Misc: `graphql-s2s` and `@types/npm` look unused **[verify]**
- `axios` is declared but `apiCore` uses `fetch` **[verify usage]**.
- Required env: `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_BACKEND_HOSTNAME`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. NextAuth also needs `NEXTAUTH_SECRET`/`NEXTAUTH_URL` in production, which are not referenced in the repo.
- `NEXT_PUBLIC_BASE_URL` is read directly in ~25 components instead of one config module.

### Backend
- **Odoo 17.0** with Python `requests` (Google token verification), PostgreSQL 14.
- **Odoo modules:** base, mail, mass_mailing, crm, contacts, account (declared). Installed DB additionally has website, website_sale, sale_crm, l10n_ae, etc.
- **Missing source:** `good_home` (v17.0.0.1) is installed in the snapshot DB but absent from the repo. The mail templates also point to `goodhometest.strangled.net`, suggesting this addon was forked from another project **[verify]**.
- **External services:** SMTP (via `ir.mail_server`), Google OAuth (client ID hard-coded in `api_ref_signup.py`).
- **Naming:** the module's technical name is `Referral-Odoo` (hyphen). XML IDs are referenced as `Referral-Odoo.*`; renaming requires an XML-ID migration.

### Operational
- Restore procedure (README): zip the `tgh_ref_dev_…` folder and restore through Odoo's database manager.
- Cron for lead escalation is **commented out** (`data/cron.xml` in manifest; `notify_noaction_coordinate` is commented out in `ref_form_data_ref.py`), so escalation does not run automatically.

---

## 7. Risks and defects

### Security

**R1 — Client-controlled role at signup (Critical).** `create_user` writes the request's `role` straight into `res.users.role`. Because authorization throughout the app keys off that field, a caller can self-register as `admin` **[verify the end-to-end effect on admin endpoints]**. It also sets `company_ids` to *all* companies and, for an existing inactive login, overwrites the password and profile without proof of ownership.

**R2 — OTP is `"0000"` (Critical).** `random.randint` is computed then immediately overwritten with `"0000"` in signup, password login, and social login. Email OTP provides no protection. `verify_otp` and `login/confirmation` have no attempt limit.

**R3 — Social login identity confusion (Critical).** `social_login` validates the Google token's audience but then looks up the user by the *client-supplied* `email`, never comparing it to the token's verified email or checking `email_verified`. Combined with R2, any valid Google token can be used to start a login as any existing user. The OAuth client ID is hard-coded in source.

**R4 — Public-by-default API (High).** 135/135 routes are `auth="public"`; 131 set `cors="*"`; 30 disable CSRF. Token enforcement appears in 24 of 44 controller files (coarse grep); role checks appear only ~14 times across the API. Ownership checks (e.g., can partner A read partner B's referrals) need endpoint-by-endpoint review. I sampled signup, withdrawals, and bank details only **[verify the rest; treat IDOR as likely]**. There are 409 `.sudo()` calls, so ORM-level protection is bypassed throughout.

**R5 — Token design (High).** 32 characters from `random.choices` (not `secrets`), stored plaintext on `res.users`, compared with `==`, no expiry, no rotation, no logout endpoint, one token per user (a new login invalidates the old session).

**R6 — Credentials in browser storage (High).** `LoginFormComponent` dispatches `saveUserCredentials({email, password})`; the Redux store is persisted to localStorage (`redux-persist`, key `Referral`), and `OTPVerifyFormComponent` reads the password back. The token is persisted the same way. Any XSS yields credentials. 51 uses of `dangerouslySetInnerHTML` raise the XSS surface (DOMPurify is a dependency, usage consistency is **[verify]**).

**R9 — Sensitive data in the repo (High).** `dump.sql` (37 users, 129 KYC documents, 45 leads, 162 commission rows, 49 account moves) and an 808 MB `filestore` are committed. The dump includes a **non-empty SMTP password** in `ir_mail_server`. Treat this SMTP credential as compromised: rotate it. Bank details (IBAN, SWIFT, account holder) are plaintext columns on `res.users`. Recommend purging from git history and moving data to a secured store; confirm the client's data-protection obligations (UAE PDPL and any India-side exposure) **[verify with client/legal]**.

### Financial correctness

**R7 — Duplicate commission (High).** `CrmLeads.write` (ref_form_data_ref.py) runs for every record whose stage `is_won` on *any* write, creating two new `ref.statement` rows each time (partner + agent). Editing a Won lead's note, or re-saving it, double-credits. Totals are recomputed from all statements, so the inflated amount flows to `total_commission`/`total_pending`. Also: `int(record.expected_budget)` will raise on non-numeric text (the field is `Char`).

**R8 — Withdrawal math inconsistent (High).** `/api/ref/withdraw_able` returns `total_withdraw − eligible_commission`, while `/api/user/bill` uses `eligible_commission − total_withdraw`. One of them is wrong (the signs are opposite). `user_bill` also doesn't reject non-positive/over-precision `price`, doesn't block multiple open bills (race → overdraw), and trusts `date`. `account.move.write` updates balances via `partner_id.user_ids.id` (breaks if a partner has multiple users) and uses `request.env` inside a model.

### Code quality / maintainability

- `ResUsers.write` and `ResUsersDocs.write` override `write` but **don't return the result**, which breaks callers expecting a boolean.
- Two `crm.lead.write` overrides exist (`ref_form_data_ref.py`, `ref_stages_email.py`); the second is wrongly decorated with `@api.model`.
- Models use `odoo.http.request` internally, so logic fails in cron, shell, or tests.
- Hard-coded host `goodhometest.strangled.net` in email templates; hard-coded Google client ID.
- Dead/contract-drift endpoints: the FE calls `/api/signup/otp/`, `/api/ref/login/`, `/ref/banner_data`, and `/api/coordinator/referral_data_all/` — none match a backend route (trailing-slash and naming drift; some may be dead code). 23 backend routes have no FE caller. Some routes look like experiments (`/api/abc` commented, `/api/ref/abhi`, `/dashboard/oo`).
- Typos baked into the contract (`comissionbreakout`, `countss`, `referal-partners`, `coordnate.py`, `staus`).
- `apiCore` swallows errors (`console.log`) and returns `undefined`, so callers must null-check; 15 `console.log` calls remain, backend has `print(token)` in social login.
- No tests, no CI config, no lint config beyond Next defaults, no API documentation.
- Heavy dependency duplication (see §6) will inflate the bundle.

### Delivery risks
- `good_home` source missing → cannot reproduce the database's module set from the repo alone.
- Installing requires Odoo 17 + restored DB; no Docker/compose or seed-only path.
- Odoo is both CMS and business engine, so a frontend rebuild can't proceed without deciding the backend direction first.

---

## 8. Recommended next steps (for approval — nothing started)

1. **Contain now (no code change in this repo needed):** rotate the SMTP credential; confirm whether the dump/filestore repos are private and who has access; confirm whether this is live or dev-only data.
2. **Confirm with a running instance:** R1 end-to-end (role escalation), R3, R7, R8, and ownership checks on a sample of dashboard endpoints.
3. **Decide architecture direction:** (a) keep Odoo as system of record and rebuild the API/auth layer, or (b) rebuild the backend and migrate data from Odoo.
4. **Obtain `good_home` source** and any deployment/infra notes from the client.
5. **Produce `docs/target-architecture.md`** and a prioritized rebuild plan.

---

## Appendix A — Route inventory summary

| Group | Count (approx.) | Notes |
|-------|-----------------|-------|
| Public CMS content (`/ref/*`, `/api/ref/*` content) | ~35 | No token needed by design; reasonable to keep public |
| Auth/signup/KYC (`/api/ref/*`, `/api/kyc/*`) | ~15 | See R1–R3, R5 |
| Referral lifecycle (`/api/referral/*`, `/crm_lead/*`) | ~20 | Core business logic |
| Dashboards/reports/exports (`/api/dashboard/*`, `/dashboard/*`, `*/excel`) | ~35 | Role-scoped, check ownership |
| Admin (`/api/admin/*`) | ~25 | Highest-privilege surface; needs strongest review |
| Withdrawals/bank (`/api/user/*`, `/api/res_user/*`, `/api/ref/withdraw_able`) | ~6 | See R8 |

Counts are approximate groupings of the 135 routes by prefix, not an exact classification.

## Appendix B — Frontend routes

`/`, `/aboutUs`, `/services`, `/services/[slug]`, `/blogs`, `/blogs/[slug]`, `/faq`, `/ourTeam`, `/contactUs`, `/commission-structure`, `/privacy-and-policy`, `/terms-and-condition`, `/thank-you`, `/login`, `/login/resetPassword`, `/referral`, `/profile`, `/lead-tracking-dashboard`, `/dashboard`, `/dashboard/{agent-data, agent-registration, co-ordinators, financial-overview, payment, profile, referal-partners, reports, track-referrals}`.

## Appendix C — Out of scope / not verified

Runtime behavior, performance, accessibility, SEO, mobile responsiveness, git history of the original repos (only the latest commit was inspected), full per-endpoint authorization review, and the contents of `good_home`.
