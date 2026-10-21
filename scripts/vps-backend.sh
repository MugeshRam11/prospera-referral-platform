#!/usr/bin/env bash
set -euo pipefail

target=${1:-}
action=${2:-}
case "$target" in dev|test) ;; *) echo 'Usage: bash scripts/vps-backend.sh <dev|test> <validate|status|migrate|build|lint|unit|integration|test>' >&2; exit 2 ;; esac
case "$action" in
  validate) command=(./node_modules/.bin/prisma validate) ;;
  status) command=(npm run migrate:status) ;;
  migrate) command=(npm run migrate:deploy) ;;
  build) command=(npm run build) ;;
  lint) command=(npm run lint) ;;
  unit) command=(npm run test:unit) ;;
  integration) command=(npm run test:integration) ;;
  test) command=(npm test) ;;
  *) echo 'Unknown action' >&2; exit 2 ;;
esac
case "$action" in unit|integration|test)
  if [[ "$target" != test ]]; then echo 'Run tests only against the test environment.' >&2; exit 2; fi ;;
esac
if [[ -d /opt/prospera/runtime/node/bin ]]; then
  export PATH="/opt/prospera/runtime/node/bin:$PATH"
fi
cd "$(dirname "${BASH_SOURCE[0]}")/.."
env_name=$target
case "$action" in status|migrate) env_name="$target-migrate" ;; esac
set -a
source "$HOME/.config/prospera/$env_name.env"
set +a
if [[ "$target" == test ]]; then
  node -e 'if(new URL(process.env.DATABASE_URL).pathname !== "/prospera_test") { console.error("Refusing unexpected test database"); process.exit(1); }'
fi
exec "${command[@]}"
