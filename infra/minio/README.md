# MinIO — анонимные политики bucket'а

## Что здесь

- `policy-2x2-media.json` — кастомная anonymous-policy для бакета `2x2-media`.

## Зачем нестандартная policy

Встроенный пресет `mc anonymous set download <bucket>` разрешает анонимным
пользователям не только `s3:GetObject`, но и `s3:ListBucket`. Это означает,
что любой человек может выполнить:

```bash
curl https://erfgv.website/2x2-media/
# → XML-список всех объектов (имена, размеры, даты загрузки)

mc anonymous get-json myminio/2x2-media
# → видна структура хранилища
```

Это утечка информации: имена файлов раскрывают организацию каталога,
имена авторов/моделей в портфолио, недоступные ещё неопубликованные товары
(если их фото залиты заранее) и т.п.

`policy-2x2-media.json` оставляет только `s3:GetObject` — ссылки по прямому
URL продолжают работать (картинки на сайте), но `LIST` возвращает 403.

## Применение через Docker Compose (автоматически)

После внесённых правок в `docker-compose.yml` сайдкар `minio-init`
монтирует этот файл и применяет policy при каждом запуске стэка.
Никаких ручных действий не требуется при свежем деплое:

```bash
docker compose up -d minio minio-init
```

`minio-init` — идемпотентный, выполнить можно сколько угодно раз.

## Применение вручную на уже работающем prod-VPS

Если стэк уже крутится и вы не хотите рестартовать:

```bash
# 1. Залить файл policy на VPS (если ещё не залит вместе с git pull)
ssh root@130.49.129.65 "ls /root/2x2-shop/infra/minio/policy-2x2-media.json"

# 2. Применить через mc внутри контейнера minio-init (или временный mc-контейнер)
docker run --rm \
  --network 2x2-shop_app-network \
  -v /root/2x2-shop/infra/minio:/policies:ro \
  -e MINIO_ROOT_USER="$(grep ^MINIO_ROOT_USER /root/2x2-shop/.env | cut -d= -f2)" \
  -e MINIO_ROOT_PASSWORD="$(grep ^MINIO_ROOT_PASSWORD /root/2x2-shop/.env | cut -d= -f2)" \
  minio/mc:RELEASE.2025-08-13T08-35-41Z sh -c '
    mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
    mc anonymous set-json /policies/policy-2x2-media.json local/2x2-media
    mc anonymous get-json local/2x2-media
  '
```

## Проверка

После применения:

```bash
# 1. LIST должен вернуть 403 (AccessDenied)
curl -i https://erfgv.website/2x2-media/
# Ожидание: HTTP/2 403  + <Code>AccessDenied</Code>

# 2. Прямой GET по существующему файлу — 200
#    (подставь имя реально загруженного файла из админки)
curl -I https://erfgv.website/2x2-media/products/test.webp
# Ожидание: HTTP/2 200, Content-Type: image/webp

# 3. Внутри VPS — проверка через mc
docker compose exec minio sh -c \
  'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && \
   mc anonymous get-json local/2x2-media'
# Ожидание: JSON совпадает с policy-2x2-media.json
```

## Откат (если что-то пошло не так)

Вернуться к встроенному пресету:

```bash
docker compose exec minio sh -c \
  'mc alias set local http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && \
   mc anonymous set download local/2x2-media'
```

Или полностью закрыть (никаких анонимных операций — потребует presigned URL
для отображения изображений на сайте, что НЕ поддерживается текущим кодом):

```bash
docker compose exec minio sh -c \
  'mc anonymous set none local/2x2-media'
```

## Связанные файлы

- `../../docker-compose.yml` — сервис `minio-init` (монтирует и применяет policy).
- `../../compose.dev.yml` — то же для dev-окружения.
