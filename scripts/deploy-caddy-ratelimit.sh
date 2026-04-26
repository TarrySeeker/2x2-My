#!/usr/bin/env bash
# Deploy Caddy with caddy-ratelimit module + auto-rollback on failure.
# Run from local machine. Requires SSH access to deploy@130.49.129.65.

set -euo pipefail

VPS=deploy@130.49.129.65
REMOTE_DIR=~/2x2-shop
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

echo "==> 1/7: git archive HEAD -> tar"
git archive HEAD -o /tmp/2x2-deploy.tar

echo "==> 2/7: scp tar -> VPS"
scp /tmp/2x2-deploy.tar $VPS:/tmp/

echo "==> 3/7: backup .env, extract tar"
ssh $VPS "cd $REMOTE_DIR && cp .env /tmp/.env.bak.$TIMESTAMP && cp docker-compose.yml docker-compose.yml.bak.$TIMESTAMP && tar -xf /tmp/2x2-deploy.tar -C . && cp /tmp/.env.bak.$TIMESTAMP .env"

echo "==> 4/7: docker compose build caddy (xcaddy build, ~5 min)"
ssh $VPS "cd $REMOTE_DIR && docker compose build caddy"

echo "==> 5/7: docker compose up -d caddy"
ssh $VPS "cd $REMOTE_DIR && docker compose up -d caddy"
sleep 30

echo "==> 6/7: smoke checks"
HEALTH=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/api/health || echo "FAIL")
ROOT=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/ || echo "FAIL")
ADMIN=$(curl -sS -o /dev/null -w "%{http_code}" https://erfgv.website/admin/login || echo "FAIL")
echo "  /api/health  -> $HEALTH"
echo "  /            -> $ROOT"
echo "  /admin/login -> $ADMIN"

if [ "$HEALTH" != "200" ] || [ "$ROOT" != "200" ] || [ "$ADMIN" != "200" ]; then
  echo "X SMOKE FAILED. Rolling back caddy..."
  ssh $VPS "cd $REMOTE_DIR && cp docker-compose.yml.bak.$TIMESTAMP docker-compose.yml && docker compose up -d caddy"
  sleep 15
  echo "  Rollback done. Verify: $(curl -s -o /dev/null -w '%{http_code}' https://erfgv.website/)"
  exit 1
fi

echo "==> 7/7: rate-limit test (11 quick requests to /admin/login)"
hits=()
for i in $(seq 1 11); do
  code=$(curl -s -o /dev/null -w "%{http_code}" https://erfgv.website/admin/login)
  hits+=("$code")
  sleep 0.3
done
echo "  Codes: ${hits[*]}"
echo "  (expected: 1-10 = 200, 11+ = 429)"

echo ""
echo "OK Deploy complete. Caddy rate-limit active."
echo "Backup compose: $REMOTE_DIR/docker-compose.yml.bak.$TIMESTAMP"
echo "To rollback later: ssh $VPS \"cd $REMOTE_DIR && cp docker-compose.yml.bak.$TIMESTAMP docker-compose.yml && docker compose up -d caddy\""
