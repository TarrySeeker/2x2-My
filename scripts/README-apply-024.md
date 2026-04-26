# Apply 024 — Safe RENAME (вместо DROP) homepage_sections

## Что делает скрипт

`apply-024-rename.sh` применяет миграцию 024 в **обратимом** варианте:

- НЕ дропает таблицу `homepage_sections` (как просит коммит `632e4e1` в исходном `024_drop_legacy_tables.sql`).
- Вместо этого: `ALTER TABLE homepage_sections RENAME TO homepage_sections_legacy_2026_04_26`.
- Все данные сохраняются под новым именем — можно мгновенно откатить одной командой.
- Перед RENAME — `pg_dump` отдельной таблицы (`--inserts`) на VPS и копия на локальную машину в `.secrets/`.
- После RENAME — smoke-тесты `/api/health`, `/`, `/admin/login` и поиск hero-текста "Рекламное агентство" на главной.
- Если хоть один smoke-тест упал — **auto-rollback**: обратный `RENAME` возвращает старое имя.

Шаги:

1. `git archive HEAD` + `scp` + `tar -x` на VPS — синхронизирует состояние репо (на случай если на VPS старая копия). Миграции **не** прогоняются — RENAME выполняется вручную через `psql`.
2. `pg_dump -t homepage_sections --inserts` внутри контейнера `postgres`, файл в `/tmp/homepage_sections_backup_<TIMESTAMP>.sql`.
3. `scp` бэкапа на локальную машину в `scripts/../.secrets/`.
4. `psql -c "ALTER TABLE IF EXISTS homepage_sections RENAME TO homepage_sections_legacy_2026_04_26;"`.
5. `psql` верификация: список таблиц с именем `LIKE '%homepage%'` (должны увидеть только `homepage_sections_legacy_2026_04_26`).
6. Smoke-тесты на проде: HTTP-коды + grep hero-текста.

## Когда запустить

В любое удобное время. Скрипт быстрый, idempotent (`IF EXISTS`), не зависит от внешних таймеров. Рекомендуется в окно низкой нагрузки (не критично — RENAME занимает миллисекунды и блокирует таблицу только на время самой команды).

## Сколько займёт

**~1 минута** суммарно:

- git archive + scp + extract: ~10 сек
- pg_dump + scp бэкапа: ~5 сек (таблица очень маленькая, ~10 строк)
- ALTER TABLE RENAME: <1 сек
- verify SELECT: <1 сек
- smoke-тесты (4 HTTP-запроса к проду): ~5 сек

## Команда для запуска

Из корня репозитория `c:/Users/pup/Desktop/2x2/2x2-shop`:

```bash
bash scripts/apply-024-rename.sh
```

(скрипт уже `chmod +x`, но `bash` явно — на случай Windows/WSL Git Bash, где executable-bit не всегда сохраняется)

## Что произойдёт при ошибке

### Auto-rollback (шаг 6, smoke-тесты)

Если после RENAME `/api/health`, `/`, `/admin/login` или hero-текст не вернулись:

1. На VPS выполняется обратный `ALTER TABLE IF EXISTS homepage_sections_legacy_2026_04_26 RENAME TO homepage_sections;`.
2. Данные восстанавливаются на месте — таблица снова доступна под старым именем.
3. Скрипт печатает HTTP-коды после rollback и падает с `exit 1`.

### Ручной rollback позже

Если позже окажется, что что-то сломано (например, обнаружится через час), просто верните имя:

```bash
ssh deploy@130.49.129.65 "cd ~/2x2-shop && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 -c \"ALTER TABLE homepage_sections_legacy_2026_04_26 RENAME TO homepage_sections;\"'"
```

### Восстановление из dump (если уже сделали окончательный DROP)

Бэкап лежит локально в `scripts/../.secrets/homepage_sections_backup_<TIMESTAMP>.sql` и на VPS в `/tmp/homepage_sections_backup_<TIMESTAMP>.sql`. Восстановление:

```bash
scp .secrets/homepage_sections_backup_<TIMESTAMP>.sql deploy@130.49.129.65:/tmp/
ssh deploy@130.49.129.65 "cd ~/2x2-shop && docker compose exec -T postgres bash -c 'PGPASSWORD=\$POSTGRES_PASSWORD psql -U postgres -d shop2x2 < /tmp/homepage_sections_backup_<TIMESTAMP>.sql'"
```

## Безопасность данных

- **Данные НЕ теряются.** RENAME — это переименование, не удаление. Все строки `homepage_sections` остаются доступны под новым именем.
- **Двойной бэкап:** перед RENAME — `pg_dump` локально (`.secrets/`) и на VPS (`/tmp/`).
- **Auto-rollback** при провале smoke-тестов.
- **Идемпотентность:** `IF EXISTS` — скрипт можно запустить повторно без падения, если таблица уже переименована.

## Предусловия

- SSH-доступ к `deploy@130.49.129.65` настроен (ключ в `~/.ssh/`).
- На VPS работает контейнер `postgres` (`docker compose ps postgres`).
- В `.env` на VPS есть `POSTGRES_PASSWORD`.
- Локальный `HEAD` — текущий main (синхронизация tar опциональна, но идёт по тому же шаблону что `deploy-caddy-ratelimit.sh`).

## После успешного RENAME

- Таблица `homepage_sections_legacy_2026_04_26` остаётся в БД как страховка.
- Через **1+ неделю** стабильной работы (после подтверждения, что код её действительно нигде не читает) — отдельная миграция `025_drop_homepage_sections_legacy.sql` с реальным `DROP TABLE`.
- Бэкап-файлы в `.secrets/` хранить минимум до выполнения окончательного DROP.

## Почему RENAME, а не DROP

Исходная миграция `024_drop_legacy_tables.sql` (коммит `632e4e1`) делает прямой `DROP TABLE homepage_sections CASCADE`. Это безопасно по коду (грепы показали — таблица нигде не читается), но необратимо. RENAME даёт окно отката без необходимости восстанавливать из dump'а — что важно, потому что sandbox блокирует прямые prod-операции, и пользователь запускает миграцию вручную, без возможности тут же среагировать на скрытую регрессию.
