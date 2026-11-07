#!/usr/bin/env bash
# Run on EC2 from repo root after production.env exists.
#   chmod +x deploy/aws/deploy.sh && ./deploy/aws/deploy.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/deploy/aws/production.env}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$ROOT"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy deploy/aws/env.example to deploy/aws/production.env and edit."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> git fetch / pull ($BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "==> docker compose build + up"
docker compose -f docker-compose.yml -f deploy/aws/docker-compose.aws.yml build
docker compose -f docker-compose.yml -f deploy/aws/docker-compose.aws.yml up -d

echo "==> done. Check: curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/api/tournaments"
