# Hostinger development environment

Prepared on 2026-10-21. This is a development and test setup, not a production deployment.

## Locations and runtime

- VPS: `88.222.245.75` (`srv595393`), Ubuntu with existing CloudPanel.
- Linux account: `prospera` (no sudo membership).
- Checkout: `/opt/prospera/work/app`.
- Runtime: Node `22.23.4`, npm `10.9.9`, under `/opt/prospera/runtime/node`.
- Prisma CLI and client: `6.19.3`, installed from the committed npm lockfile.
- Base commit: `e334c10fe759cd55b97c1b00e2779ad24aab581e`.
- GitHub origin: `https://github.com/MugeshRam11/prospera-referral-platform.git`.
- The base commit was one commit ahead of GitHub at setup time. It was imported using a Git bundle; the checkout is detached and contains the setup repairs as local changes. Nothing was pushed to GitHub.

CloudPanel, its sites, firewall rules, and other database services were not reconfigured. No persistent backend HTTP service was started. The existing server entrypoint binds on all interfaces; review binding and access controls before starting a persistent service on this VPS.

## Databases and credentials

PostgreSQL remains accessible only through `127.0.0.1:5432` and `[::1]:5432`.

| Database | Application role | Migration owner |
| --- | --- | --- |
| `prospera_dev` | `prospera_dev_app` | `prospera_dev_migrator` |
| `prospera_test` | `prospera_test_app` | `prospera_test_migrator` |

All four roles lack superuser, role-creation, and database-creation privileges. Application roles receive table CRUD and sequence access, but do not own the schema or have access to `_prisma_migrations`. Public database access is revoked. Future tables created by the matching migration owner inherit application CRUD grants.

Secrets are generated on the server and stored in mode-600 files inside the mode-700 directory `/home/prospera/.config/prospera`:

- `dev.env` and `test.env`: restricted application credentials.
- `dev-migrate.env` and `test-migrate.env`: schema-owner credentials.

The checkout's ignored `.env` is a symlink to `dev.env`; no pre-existing environment file was overwritten. The wrapper exports the selected environment before invoking npm or Prisma, so `.env` cannot switch a test run to the development database. Do not print or copy these files into Git.

## Commands

From the root SSH session, enter the application account:

```bash
sudo -iu prospera
cd /opt/prospera/work/app
export PATH=/opt/prospera/runtime/node/bin:$PATH
bash scripts/vps-backend.sh dev validate
bash scripts/vps-backend.sh dev status
bash scripts/vps-backend.sh test status
bash scripts/vps-backend.sh test unit
bash scripts/vps-backend.sh test integration
bash scripts/vps-backend.sh dev build
bash scripts/vps-backend.sh dev lint
```

The wrapper refuses test commands with the `dev` target and checks that a test environment targets `prospera_test`.

Before applying a future migration, review its SQL and migration status, and back up any development data that matters. Then explicitly run:

```bash
bash scripts/vps-backend.sh dev migrate
bash scripts/vps-backend.sh test migrate
```

Do not use `prisma migrate reset` or substitute `prisma db push` for migration review.

## Migration repair and test behavior

The initial migration had a leading UTF-8 byte-order mark. PostgreSQL rejected it at the first character; inspection confirmed zero application tables and zero applied steps. The byte-order mark was removed without altering SQL statements. The failed development attempt was marked rolled back with Prisma, then deployment succeeded. The test database applied the corrected migration directly. Both databases subsequently reported up-to-date migrations and no schema differences.

The integration suite now fails when PostgreSQL is unavailable, propagates cleanup errors, tracks standalone OTP records for teardown, and uses unique session tokens. Unit tests use mocks/in-memory repositories; the separate integration suite exercises real PostgreSQL through the application role.

Verified on the VPS: TypeScript build and ESLint pass; 82 unit tests pass; 12 real PostgreSQL integration tests pass. No tests were skipped in these successful runs.

Additional verification: the integration suite was rerun through the wrapper, all test fixture tables were empty afterward, a deliberately unreachable database produced a failing exit status, and the wrapper rejected a test run against `dev`. The application role cannot create schema objects or update migration history; the test application role cannot connect to the development database.

## GitHub workflow

Make and review code changes locally, commit selected files, and push a reviewed branch to GitHub. The existing local README edit belongs to the user and was not included in the setup changes.

Before updating the VPS, inspect `git status` and preserve its setup changes. Once these changes are committed and available on GitHub, reconcile the VPS copies with that commit; do not discard them blindly. Fetch using the non-root application account and check out an explicit reviewed commit. Run `npm ci`, `npm run prisma:generate`, review migrations, and use the checks above. Do not automatically deploy the newest branch tip or run dependency installation as root.

The dedicated workstation SSH key is `~/.ssh/prospera_codex_dev_20261021`; its public key is authorized on the VPS. Keep the private key on the workstation. The verified host key is preserved in `~/.ssh/prospera_known_hosts`. Connect from Windows PowerShell with:

```powershell
ssh -i "$env:USERPROFILE/.ssh/prospera_codex_dev_20261021" -o IdentitiesOnly=yes -o "UserKnownHostsFile=$env:USERPROFILE/.ssh/prospera_known_hosts" -o StrictHostKeyChecking=yes root@88.222.245.75
```
