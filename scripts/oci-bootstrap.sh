#!/usr/bin/env bash
# Bootstrap Designflix API on Oracle Linux 9 (Ampere aarch64)
# Usage (as opc): bash scripts/oci-bootstrap.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/home/opc/designflix-api}"
REPO_URL="${REPO_URL:-git@github.com:orlandoneto/designflix-api.git}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> System packages"
sudo dnf -y update
sudo dnf -y install git nginx mysql-server firewalld

echo "==> Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | sudo bash -
  sudo dnf -y install nodejs
fi
sudo npm install -g pm2

echo "==> MySQL"
sudo systemctl enable --now mysqld
# Set root password / app user only if .env provides DB_* — operator finishes manually first boot

echo "==> Firewall (SSH already; HTTP/HTTPS)"
sudo systemctl enable --now firewalld || true
sudo firewall-cmd --permanent --add-service=http || true
sudo firewall-cmd --permanent --add-service=https || true
sudo firewall-cmd --reload || true

echo "==> App directory"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
mkdir -p logs
npm ci --omit=dev || npm install --omit=dev

echo "==> Done packages. Next (manual / agent):"
echo "  1. Create .env (production) with DB_*, JWT, FRONTEND_URLS, SMTP"
echo "  2. Create MySQL database + user matching .env"
echo "  3. npx sequelize-cli db:migrate"
echo "  4. pm2 start ecosystem.oracle.config.js && pm2 save && pm2 startup"
echo "  5. Configure nginx proxy to PORT 4000 + TLS"
echo "  6. CATALOG_SEARCH_PROVIDER=mysql (skip Meili on day 1)"
