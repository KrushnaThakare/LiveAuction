#!/usr/bin/env bash
# Load env from load-test/.env then run a k6 script.
# Usage: ./load-test/run.sh smoke|viewers|poll|bids

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ROOT}/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if ! command -v k6 >/dev/null 2>&1; then
  echo "k6 is not installed. See load-test/README.md#install-k6"
  exit 1
fi

SCENARIO="${1:-smoke}"
shift || true

case "$SCENARIO" in
  smoke)   SCRIPT="${ROOT}/scripts/smoke.js" ;;
  viewers) SCRIPT="${ROOT}/scripts/overlay-viewers.js" ;;
  poll)    SCRIPT="${ROOT}/scripts/overlay-poll-only.js" ;;
  bids)    SCRIPT="${ROOT}/scripts/auction-bids.js" ;;
  *)
    echo "Usage: $0 smoke|viewers|poll|bids [extra k6 args...]"
    exit 1
    ;;
esac

# Pass .env values into k6
exec k6 run "$SCRIPT" \
  -e "API_URL=${API_URL:-http://localhost:8080/api}" \
  -e "TOURNAMENT_ID=${TOURNAMENT_ID:-1}" \
  -e "OVERLAY_TOKEN=${OVERLAY_TOKEN:-}" \
  -e "ADMIN_USERNAME=${ADMIN_USERNAME:-admin}" \
  -e "ADMIN_PASSWORD=${ADMIN_PASSWORD:-admin123}" \
  -e "TEAM_ID=${TEAM_ID:-1}" \
  -e "VUS_MAX=${VUS_MAX:-100}" \
  -e "VIEWER_DURATION_SEC=${VIEWER_DURATION_SEC:-600}" \
  -e "STAGES=${STAGES:-}" \
  -e "POLL_INTERVAL_SEC=${POLL_INTERVAL_SEC:-3}" \
  -e "BID_INTERVAL_SEC=${BID_INTERVAL_SEC:-4}" \
  -e "DURATION=${DURATION:-15m}" \
  "$@"
