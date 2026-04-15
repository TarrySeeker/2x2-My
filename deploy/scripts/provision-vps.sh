#!/usr/bin/env bash
# Первичная настройка чистого Timeweb VPS (Ubuntu 22.04 / 24.04) под 2x2-shop.
# Запускать от root ОДИН РАЗ:
#   bash provision-vps.sh
# После завершения — перелогиниться как deploy и запускать deploy.sh

set -euo pipefail

DEPLOY_USER="deploy"
APP_DIR="/var/www/2x2-shop"
LOG_DIR="/var/log/2x2-shop"
NODE_MAJOR=20

if [[ $(id -u) -ne 0 ]]; then
  echo "Запусти от root" && exit 1
fi

log() { echo -e "\n\033[1;32m==> $*\033[0m"; }

log "1. apt update / upgrade"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

log "2. Базовый набор пакетов"
apt-get install -y \
  curl git build-essential ufw fail2ban \
  nginx certbot python3-certbot-nginx \
  htop unattended-upgrades logrotate rsync unzip

log "3. Автоматические security-обновления"
dpkg-reconfigure -f noninteractive unattended-upgrades

log "4. Node.js $NODE_MAJOR"
curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
apt-get install -y nodejs
npm install -g pnpm@9 pm2

log "5. Пользователь $DEPLOY_USER"
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
  usermod -aG sudo "$DEPLOY_USER"
  mkdir -p /home/$DEPLOY_USER/.ssh
  # Сюда ОБЯЗАТЕЛЬНО положить публичный ключ клиента (или GH Actions deploy-key)
  touch /home/$DEPLOY_USER/.ssh/authorized_keys
  chmod 700 /home/$DEPLOY_USER/.ssh
  chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
  chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh
fi

log "6. Директории приложения и логов"
mkdir -p "$APP_DIR" "$LOG_DIR"
chown -R $DEPLOY_USER:$DEPLOY_USER "$APP_DIR" "$LOG_DIR"

log "7. SSH hardening (отключаем root и парольный вход)"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd

log "8. Firewall (ufw)"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

log "9. fail2ban (SSH + nginx)"
systemctl enable --now fail2ban

log "10. Swap 2G (если нет)"
if ! swapon --show | grep -q swap; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "11. Timezone Asia/Yekaterinburg (ХМАО)"
timedatectl set-timezone Asia/Yekaterinburg

log "12. logrotate для приложения"
cat >/etc/logrotate.d/2x2-shop <<'EOF'
/var/log/2x2-shop/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy deploy
    sharedscripts
    postrotate
        [ -x /usr/bin/pm2 ] && su - deploy -c "pm2 flush" > /dev/null 2>&1 || true
    endscript
}
EOF

log "13. PM2 автозапуск от deploy"
su - $DEPLOY_USER -c "pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER" || true

cat <<'NEXT'

✅ VPS готов. Дальнейшие шаги (от пользователя deploy):
  1. cd /var/www/2x2-shop && git clone <repo-url> .
  2. Положить .env.production (см. docs/env-vars.md, mode 600)
  3. pnpm install --frozen-lockfile && pnpm build
  4. pm2 start ecosystem.config.cjs --env production && pm2 save
  5. cp deploy/nginx/limits.conf    /etc/nginx/conf.d/10-limits.conf
     cp deploy/nginx/2x2-shop.conf  /etc/nginx/sites-available/
     ln -s /etc/nginx/sites-available/2x2-shop.conf /etc/nginx/sites-enabled/
     nginx -t && systemctl reload nginx
  6. certbot --nginx -d 2x2hmao.ru -d www.2x2hmao.ru
  7. curl https://2x2hmao.ru/api/health → должен вернуть {"status":"healthy", ...}
NEXT
