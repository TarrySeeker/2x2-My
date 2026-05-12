-- 044_deprecate_reviews.sql — 2026-05-12
--
-- Помечаем таблицу `reviews` как deprecated на уровне SQL-комментария.
-- Сами таблицы НЕ удаляем (DROP TABLE), потому что:
--   1) могут содержать исторические данные у клиента;
--   2) reviews имеет потенциальные FK от deprecated-таблиц `products`
--      и `orders` (см. миграции 002_schema.sql + 006_cms_and_security.sql:
--      reviews.product_id -> products, reviews.order_id NULLABLE).
--      Удаление BIGSERIAL-таблицы с такими связями = большой
--      блокирующий миграционный пакет. Не нужен прямо сейчас.
--   3) В RPC `get_dashboard_stats()` (миграции 003 и 006) пока ещё
--      есть подсчёт `pending_reviews`. Удаление таблицы сломает RPC,
--      пока не обновим функцию. Сейчас прикладной слой больше не
--      читает это поле — RPC-результат игнорируется.
--
-- Прикладной слой 2х2 перестал обращаться к этой таблице 2026-05-12
-- (см. удаление /admin/reviews + удаление компонентов на витрине).
-- Раздел «Отзывы» полностью убран — у клиента нет отзывов и блок не
-- нужен.
--
-- Аналог миграции 030_deprecate_products.sql (чистка «Товары»).
-- Идемпотентно — повторный прогон ничего не сломает.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    EXECUTE $cmt$
      COMMENT ON TABLE reviews IS
        'DEPRECATED 2026-05-12. Раздел «Отзывы» удалён из приложения '
        '(см. AdminSidebar.tsx и chore/remove-reviews-2026-05-12). '
        'Прикладной слой больше не читает таблицу. Таблица оставлена '
        'как read-only архив; новые INSERT/UPDATE не делаются. RPC '
        'get_dashboard_stats() пока ещё возвращает pending_reviews — '
        'значение игнорируется в UI. Когда-нибудь — DROP TABLE после '
        'чистки FK от products/orders и обновления RPC.'
    $cmt$;
  END IF;
END$$;
