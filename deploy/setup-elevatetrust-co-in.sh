#!/usr/bin/env bash
# Run on EC2 as ubuntu user.
# Wires elevatetrust.co.in → BoardRoom containers via the existing elevatetrust nginx.
set -euo pipefail

BOARDROOM_DIR="${BOARDROOM_DIR:-$HOME/BoardRoom-AI}"
ELEVATETRUST_DIR="${ELEVATETRUST_DIR:-/opt/elevatetrust}"
NGINX_CONF_DIR="$ELEVATETRUST_DIR/nginx/conf.d"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"

echo "==> Checking BoardRoom containers..."
cd "$BOARDROOM_DIR"
docker compose ps

echo "==> Checking nginx can reach BoardRoom..."
docker exec elevatetrust-nginx-1 wget -qO- http://boardroom_frontend:80/ >/dev/null
docker exec elevatetrust-nginx-1 wget -qO- http://boardroom_api:8000/health >/dev/null
echo "    OK"

echo "==> Installing HTTP nginx config for elevatetrust.co.in..."
sudo cp "$BOARDROOM_DIR/deploy/nginx.elevatetrust.co.in.http-only.conf" \
  "$NGINX_CONF_DIR/elevatetrust.co.in.conf"
docker exec elevatetrust-nginx-1 nginx -t
docker exec elevatetrust-nginx-1 nginx -s reload

echo "==> Testing HTTP..."
curl -fsS -H "Host: elevatetrust.co.in" http://127.0.0.1/ | head -c 120
echo ""
echo "    HTTP routing OK (should mention BoardRoom, not Deepfake)"

if [[ -z "$CERTBOT_EMAIL" ]]; then
  echo ""
  echo "NEXT: get SSL cert, then re-run with CERTBOT_EMAIL set:"
  echo "  CERTBOT_EMAIL=you@example.com bash $BOARDROOM_DIR/deploy/setup-elevatetrust-co-in.sh --ssl"
  exit 0
fi

if [[ "${1:-}" != "--ssl" ]]; then
  exit 0
fi

echo "==> Requesting SSL certificate for elevatetrust.co.in..."
cd "$ELEVATETRUST_DIR"
docker compose -f docker-compose.prod.yml --profile manual run --rm --entrypoint certbot certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d elevatetrust.co.in \
  -d www.elevatetrust.co.in

echo "==> Installing HTTPS nginx config..."
sudo cp "$BOARDROOM_DIR/deploy/nginx.elevatetrust.co.in.conf" \
  "$NGINX_CONF_DIR/elevatetrust.co.in.conf"
docker exec elevatetrust-nginx-1 nginx -t
docker exec elevatetrust-nginx-1 nginx -s reload

echo "==> Done. Open https://elevatetrust.co.in"
