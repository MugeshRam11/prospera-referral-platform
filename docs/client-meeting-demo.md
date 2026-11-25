# Prospera client meeting handoff

**Partially demo-ready overall.** All ten requested scenes passed in Chrome on the private preview using ordinary sign-in, seven synthetic personas and PostgreSQL. The member reopened referral **REF-2026-980593** and saw its persisted history through CONTACTED. The production release and existing development accounts were left in place.

## Presenter walkthrough

| Scene | Action | Evidence from rehearsal |
| --- | --- | --- |
| 1. Admin | Open overview, then the organization network. | Authenticated database-backed pages opened. [Screenshot](demo-evidence/01-admin.png) |
| 2. Services | Open the catalogue and view a service. | Cards use existing brand images and active API catalogue records. [Screenshot](demo-evidence/02-services.png) |
| 3. Property | Filter for Abu Dhabi and select Refer Client on Palm Garden House. | The wizard selected the same illustrative property. [Screenshot](demo-evidence/03-property.png) |
| 4. Agency member | Use synthetic client details and consent. Save the draft twice, then submit. | The same persisted referral entered Pending Agency Review. |
| 5. Agency admin | Open the member's referral from Team Referrals and approve. | The agency decision forwarded the referral to central intake. The agency owner also signed into the agency workspace. |
| 6. Coordinator | Open the new intake item, choose the demo agent and assign. | The assignment persisted and appeared in the agent's queue. |
| 7. Assigned agent | Open the referral, record contact and save a note. | The stage changed to CONTACTED. |
| 8. Member tracking | Reopen the same referral under the original member. | The timeline showed draft, pending agency approval, agency approval, assignment and contact. [Screenshot](demo-evidence/08-timeline.png) |
| 9. Independent agent and corporate partner | Submit one synthetic referral as each persona. | Both received direct-to-Prospera confirmation. |
| 10. Orientation | Open the member guide, skip, reload and resume. | Progress persisted for the signed-in user. [Screenshot](demo-evidence/10-guide.png) |

Use [the local portal](http://127.0.0.1:3004) on the presenter workstation. The workstation's private role launcher opens separate Chrome sessions through the normal login form. Use fresh synthetic client phone numbers when demonstrating multiple submissions. Preserve REF-2026-980593 as a fallback for the tracking scene. The guide can be resumed for a returning demo user.

## Preview preflight

The preview uses the isolated prospera_test database, a loopback-only API on VPS port 3291, an SSH tunnel on workstation port 3100, and Next.js on workstation port 3004. Its processes are temporary. Before the meeting, open [the proxied health check](http://127.0.0.1:3004/api/v1/health) and sign in to one workspace. A tunnel loss during a repeat rehearsal interrupted sign-in. Restoring the tunnel and repeating the full walkthrough succeeded.

If the local tunnel closes, use the existing authorized SSH connection from the presenter workstation. Keep the process running during the meeting.

~~~powershell
ssh -N -o BatchMode=yes -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -i ~/.ssh/prospera_vps -L 127.0.0.1:3100:127.0.0.1:3291 root@88.222.245.75
~~~

If Next.js is stopped, run the following in the feature checkout with the verified frontend build present.

~~~powershell
cd frontend
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3004
~~~

## Implementation and checks

Branch `feature/frontend-kyc-admin-implementation`, implementation commit `19cbb996755bcfe46ea254a673ad9cf71b3eaba9`. The branch began at `41da4e3`. At inspection, main contained no tracked frontend/src tree. Use `git show --name-only 19cbb99` for the exact 49-file implementation manifest.

| Files affected | Delivered |
| --- | --- |
| prisma/schema.prisma and prisma/migrations/20261122000000_referral_review/migration.sql | Additive agency review, consent, property context, retry and revision fields, user orientation progress. Existing LeadStatus values preserved. |
| src/modules/referrals, agency, admin, auth, profile, banking, kyc and src/middleware/errorHandler.ts | Agency review and mandatory return reasons, scoped queues, transactional assignment and status history, private follow-ups, identity and access checks. |
| frontend/src/app/referrals, services, agency, coordinator, admin, partner, commissions, withdrawals, settings and home | Persisted six-step wizard, real service discovery, sample property selection, review and assignment actions, role dashboards and financial availability states. |
| frontend/src/components, frontend/src/lib, frontend/src/types | Role-aware guidance and navigation, detail modal, timeline, typed client and catalogue presentation. |
| package-lock.json and tests | Repaired PGlite lock mismatch and added or updated role, referral, repository and PostgreSQL regression checks. |

| Final check | Result |
| --- | --- |
| Clean locked backend dependency install | Passed with npm ci on Linux |
| Backend build and lint | Passed |
| Backend unit and authorization suites | 160/160 passed, including persona authorization tests |
| Isolated real PostgreSQL integration tests | 13/13 passed, including concurrent decisions, assignment and duplicate prevention |
| Frontend lint and production build | Passed, 33 routes built |
| Authenticated desktop Chrome rehearsal | Ten scenes passed, seven personas signed in, including both direct-submission paths |

The baseline unit run had four fixture setup timeouts. Reusing a fixture password hash removed redundant setup work. The administrative assignment path requires a reason for reassignment and records it. Submitted agency referrals require approval by a different authorized member of the same agency. A coordinator can assign an eligible agent after intake. A member can correct a returned draft. Concurrent changes are checked against the stored revision. Internal follow-up notes are restricted to operational readers.

## Meeting limits and release blockers

- The sample property catalogue has three fictional listings with visible sample labels. An approved inventory provider, verified prices and live availability remain outstanding. The selected sample ID is persisted with the referral.
- The preview uses synthetic accounts and catalogue fixtures. The separate development database contained four historical referrals and three active services. The new migration was applied only to the isolated test database. An authorized development rollout and smoke test remain outstanding.
- Five development KYC document references had no matching file in the two inspected development storage locations. A verified document download requires a suitable synthetic file. No private document was opened.
- Assigned operations in this demo use the existing eligible independent-agent role. A distinct internal-only operations roster requires a business decision. Payout requests remain disabled. The portal only exposes available commission records when supported by stored data.
- The demo covers the ten listed desktop scenes. Mobile layouts, expiration during an active browser session, every privileged exception and every compliance screen were not independently rehearsed. The screenshot set is available if the temporary host or tunnel is unavailable.
- No production deployment, migration, password rotation or data reseed was performed. CloudPanel, Odoo and the existing application service were preserved.

## 26 November presenter cue

At the client-details step, leave the declaration unchecked. Enter synthetic service requirements, save the draft and reopen it. At Review, show that Submit referral is disabled. Return to Client and consent, read the declaration, confirm it and submit. Follow the same reference through agency approval, assignment and contact using the scenes above. Use separate fresh phone numbers for the independent-agent and partner submissions.

The audit event identifies the person making the declaration, the text and version they confirmed, the time and the referral reference. To assess the referred person's permission separately, the reviewer should be able to establish who gave permission, when, by which channel, what information could be shared, with whom and for which purpose. Use an approved restricted record or a direct confirmation if evidence is needed. Keep private correspondence and identity documents out of referral notes. Agree the evidence, retention and withdrawal procedure before production.

The four service-specific question sets are optional discovery prompts. Amounts may be approximate. The existing requirements field stores the responses within its 1,200-character limit. The property selector links an illustrative project. Referral email delivery requires a configured transport and verified recipients for each transition.
