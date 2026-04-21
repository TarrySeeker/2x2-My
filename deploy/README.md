# DEPRECATED — папка `deploy/` удалена в Chain 3

Старый деплой через PM2 + nginx-conf-копирование заменён на
Docker Compose (см. `/docker-compose.yml` в корне) + Caddy
(см. `/Caddyfile`).

Удалённые артефакты:
- `deploy/nginx/2x2-shop.conf` — заменён на Caddyfile в корне
- `deploy/nginx/limits.conf` — встроено в Caddyfile
- `deploy/scripts/deploy.sh` — заменён на `docker compose up -d --build`
- `deploy/scripts/backup.sh` — заменён на `scripts/backup-db.sh`
- `deploy/scripts/provision-vps.sh` — заменён на инструкцию в `docs/DEPLOY.md`
- `deploy/docker/docker-compose.yml` — заменён на `/docker-compose.yml` в корне

> **TODO:** удалить всю папку `deploy/` при коммите Chain 3:
> `git rm -r deploy/`
