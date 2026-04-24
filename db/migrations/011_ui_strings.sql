-- ============================================================
-- 011_ui_strings.sql — микротексты UI (формы, кнопки, валидации, cookie, empty states)
-- ============================================================
-- Этап CMS-перевода витрины (2026-04-24). Переносит tekst-константы из:
--   content/cookie-banner.ts
--   content/empty-states.ts        (emptyStates, adminEmptyStates,
--                                   successMessages, errorMessages,
--                                   placeholders, agreementLabels,
--                                   buttonLabels)
--   Header nav labels (components/layout/HeaderClient.tsx)
--   Footer nav/services (components/layout/Footer.tsx)
--   ContactForm labels, QuoteModal/OneClickModal labels.
--
-- Модель хранения: плоская key/value-таблица с namespace для группировки.
-- Ключ — точечная нотация, пример: `cookie.title`, `form.contact.name.label`.
-- Это даёт клиенту возможность править любые микротексты, а разработчику —
-- единый способ получить строку: getUiString('form.contact.name.label').
--
-- Намеренно НЕ делаем i18n (проект ru-only). Если завтра понадобится —
-- добавим колонку `locale TEXT NOT NULL DEFAULT 'ru'` и составной unique
-- (key, locale). Сейчас — проще и быстрее.
--
-- RLS не используется. Авторизация — requireAdmin в server actions.
-- Роль `content` имеет доступ к редактированию ui_strings; роли
-- `owner`/`manager` — полный.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Таблица
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ui_strings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,             -- 'form.contact.name.label'
  value       TEXT NOT NULL,                    -- переведённая строка
  namespace   TEXT NOT NULL,                    -- 'forms' | 'modals' | 'errors' | 'validation' | 'cookie' | 'navigation' | 'empty_states' | 'success' | 'buttons' | 'placeholders' | 'agreements'
  description TEXT NULL,                        -- подсказка для клиента в админке
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT NULL
);

COMMENT ON TABLE  ui_strings IS 'Микротексты UI: формы, кнопки, валидации, cookie, empty states, навигация. Редактируется контент-менеджером.';
COMMENT ON COLUMN ui_strings.key IS 'Точечная нотация: namespace.block.element[.variant]. Пример: form.contact.phone.placeholder';
COMMENT ON COLUMN ui_strings.namespace IS 'Группа для админки-листинга. Совпадает с префиксом key.';

-- ------------------------------------------------------------
-- 2. Индексы
-- ------------------------------------------------------------
-- UNIQUE constraint на key уже создаёт b-tree индекс.
CREATE INDEX IF NOT EXISTS idx_ui_strings_namespace ON ui_strings (namespace);

-- ------------------------------------------------------------
-- 3. Триггер updated_at
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_ui_strings_updated ON ui_strings;
CREATE TRIGGER tr_ui_strings_updated
  BEFORE UPDATE ON ui_strings
  FOR EACH ROW EXECUTE FUNCTION trg_update_updated_at();

-- ------------------------------------------------------------
-- 4. Seed — все тексты из текущих TS-констант
-- ------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════
-- NAVIGATION (header + footer)
-- ═══════════════════════════════════════════════════════════
-- NOTE: Структура меню хранится целиком в site_settings.navigation_header /
-- navigation_footer (см. миграция 012). Здесь — только сквозные метки
-- (logo alt, aria-label, tagline), которые используются вне навигации.
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('navigation.logo_aria_label', '2×2 — рекламное агентство', 'navigation', 'Aria-label ссылки на главную в шапке'),
  ('navigation.logo_line1',      'Рекламное',                   'navigation', 'Первая строка подписи логотипа'),
  ('navigation.logo_line2',      'агентство',                   'navigation', 'Вторая строка подписи логотипа'),
  ('navigation.logo_subline1',   'Работы по',                   'navigation', 'Первая строка подпечати справа от логотипа'),
  ('navigation.logo_subline2',   'ХМАО и ЯНАО',                 'navigation', 'Вторая строка подпечати справа от логотипа'),
  ('navigation.footer_nav_title', 'Навигация',                  'navigation', 'Заголовок блока навигации в футере'),
  ('navigation.footer_services_title', 'Услуги',                'navigation', 'Заголовок блока услуг в футере'),
  ('navigation.footer_contacts_title', 'Контакты',              'navigation', 'Заголовок блока контактов в футере'),
  ('navigation.footer_tagline',  'Рекламное агентство полного цикла. Создаём рекламу, которую замечают.', 'navigation', 'Краткое описание в футере под логотипом'),
  ('navigation.footer_copyright','© %YEAR% 2×2 Рекламное агентство. Все права защищены.', 'navigation', 'Копирайт в футере. %YEAR% заменяется на текущий год.'),
  ('navigation.burger_open',     'Открыть меню',                'navigation', 'Aria-label кнопки бургера в мобильном шапке'),
  ('navigation.burger_close',    'Закрыть меню',                'navigation', 'Aria-label кнопки закрытия мобильного меню')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- COOKIE BANNER
-- Источник: content/cookie-banner.ts
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('cookie.title',            'Мы используем cookies',                                                                           'cookie', 'Заголовок cookie-баннера'),
  ('cookie.body',             'Сайт использует файлы cookie для аналитики и улучшения работы сервиса.',                          'cookie', 'Текст-пояснение в cookie-баннере'),
  ('cookie.policy_text',      'Подробнее в Политике конфиденциальности',                                                         'cookie', 'Текст ссылки на политику'),
  ('cookie.accept_label',     'Принять',                                                                                         'cookie', 'Кнопка «Принять» в cookie-баннере'),
  ('cookie.decline_label',    'Отклонить',                                                                                       'cookie', 'Кнопка «Отклонить» в cookie-баннере'),
  ('cookie.close_aria_label', 'Закрыть уведомление о cookies',                                                                   'cookie', 'Aria-label кнопки-крестика')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- EMPTY STATES — витрина
-- Источник: content/empty-states.ts:emptyStates
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('empty.catalog.title',   'По вашему запросу ничего не нашлось',                                                               'empty_states', 'Заголовок для пустого каталога'),
  ('empty.catalog.text',    'Попробуйте сбросить фильтры или изменить поисковый запрос. Не нашли нужную услугу — оставьте заявку, мы возьмёмся за нестандартный проект.', 'empty_states', 'Подпись для пустого каталога'),
  ('empty.catalog.cta_label', 'Сбросить фильтры',                                                                                'empty_states', 'Кнопка для пустого каталога'),
  ('empty.search.title',    'Ничего не нашли',                                                                                    'empty_states', 'Пустое состояние поиска'),
  ('empty.search.text',     'Проверьте написание или попробуйте другой запрос. Например: «визитки», «вывеска», «баннер», «стела», «световые буквы».', 'empty_states', 'Подпись пустого поиска'),
  ('empty.search.cta_label', 'Перейти в каталог',                                                                                 'empty_states', 'Кнопка пустого поиска'),
  ('empty.portfolio.title', 'Портфолио пополняется',                                                                              'empty_states', 'Пустое портфолио'),
  ('empty.portfolio.text',  'Добавляем новые кейсы по мере реализации проектов. Свяжитесь с нами — покажем примеры работ под вашу задачу.', 'empty_states', 'Подпись пустого портфолио'),
  ('empty.portfolio.cta_label', 'Связаться',                                                                                      'empty_states', 'Кнопка пустого портфолио'),
  ('empty.blog.title',      'Статей пока нет',                                                                                    'empty_states', 'Пустой блог'),
  ('empty.blog.text',       'Готовим материалы о рекламе, полиграфии и наружке в ХМАО. Первые публикации — уже скоро.',           'empty_states', 'Подпись пустого блога'),
  ('empty.blog.cta_label',  'На главную',                                                                                         'empty_states', 'Кнопка пустого блога'),
  ('empty.faq.title',       'Вопросы не найдены',                                                                                 'empty_states', 'Пустой FAQ'),
  ('empty.faq.text',        'Не нашли ответ — напишите нам напрямую, ответим в течение часа.',                                    'empty_states', 'Подпись пустого FAQ'),
  ('empty.faq.cta_label',   'Написать',                                                                                           'empty_states', 'Кнопка пустого FAQ')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- SUCCESS MESSAGES
-- Источник: content/empty-states.ts:successMessages
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('success.quote_request_sent', 'Заявка отправлена. Менеджер свяжется в течение часа — в рабочие дни с 9:00 до 19:00. В выходные — в ближайший рабочий день.', 'success', 'Успех — QuoteModal'),
  ('success.one_click_sent',     'Заявка принята. Перезвоним в течение 15 минут, чтобы уточнить детали.',                              'success', 'Успех — OneClickModal'),
  ('success.contact_form_sent',  'Сообщение получено. Ответим в течение рабочего дня — по телефону или на указанный email.',          'success', 'Успех — ContactForm'),
  ('success.review_submitted',   'Спасибо за отзыв! Опубликуем после проверки в течение 1–2 рабочих дней.',                            'success', 'Успех — форма отзыва'),
  ('success.saved',              'Сохранено',                                                                                          'success', 'Админка — сохранено'),
  ('success.published',          'Опубликовано',                                                                                       'success', 'Админка — опубликовано'),
  ('success.deleted',            'Удалено',                                                                                            'success', 'Админка — удалено'),
  ('success.status_updated',     'Статус обновлён',                                                                                    'success', 'Админка — статус обновлён'),
  ('success.photo_uploaded',     'Фото загружено',                                                                                     'success', 'Админка — фото загружено'),
  ('success.order_closed',       'Заявка закрыта',                                                                                     'success', 'Админка — заявка закрыта')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- ERROR MESSAGES
-- Источник: content/empty-states.ts:errorMessages
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('error.not_found.code',     '404',                                                                                              'errors', '404 — код'),
  ('error.not_found.title',    'Страница не найдена',                                                                              'errors', '404 — заголовок'),
  ('error.not_found.text',     'Возможно, вы перешли по устаревшей ссылке или страница была перемещена.',                          'errors', '404 — подпись'),
  ('error.not_found.cta_label','На главную',                                                                                       'errors', '404 — кнопка'),
  ('error.server.code',        '500',                                                                                              'errors', '500 — код'),
  ('error.server.title',       'Что-то пошло не так',                                                                              'errors', '500 — заголовок'),
  ('error.server.text',        'Мы уже разбираемся с проблемой. Попробуйте обновить страницу или позвоните нам напрямую.',         'errors', '500 — подпись'),
  ('error.server.cta_label',   'Позвонить',                                                                                        'errors', '500 — кнопка'),
  ('error.network.title',      'Нет подключения',                                                                                  'errors', 'Нет сети — заголовок'),
  ('error.network.text',       'Проверьте интернет и попробуйте ещё раз.',                                                         'errors', 'Нет сети — подпись'),
  ('error.network.cta_label',  'Повторить',                                                                                        'errors', 'Нет сети — кнопка'),
  ('error.quote_request_failed', 'Не удалось отправить заявку. Проверьте номер телефона и попробуйте ещё раз — или позвоните нам напрямую.', 'errors', 'Ошибка отправки формы расчёта'),
  ('error.catalog.title',      'Ошибка загрузки каталога',                                                                         'errors', 'Ошибка страницы каталога'),
  ('error.catalog.text',       'Попробуйте обновить страницу. Если ошибка повторяется — свяжитесь с нами.',                        'errors', 'Ошибка страницы каталога — текст'),
  ('error.catalog.cta_label',  'Обновить',                                                                                         'errors', 'Ошибка страницы каталога — кнопка'),
  ('error.product.title',      'Ошибка загрузки товара',                                                                           'errors', 'Ошибка карточки товара'),
  ('error.product.text',       'Попробуйте обновить страницу. Если ошибка повторяется — свяжитесь с нами.',                        'errors', 'Ошибка карточки товара — текст'),
  ('error.product.cta_label',  'В каталог',                                                                                        'errors', 'Ошибка карточки товара — кнопка'),
  ('error.admin_load',         'Ошибка загрузки данных. Попробуйте обновить страницу.',                                            'errors', 'Админка — ошибка загрузки'),
  ('error.admin_save',         'Не удалось сохранить. Проверьте соединение и попробуйте ещё раз.',                                 'errors', 'Админка — ошибка сохранения'),
  ('error.admin_delete',       'Не удалось удалить. Возможно, запись используется в других разделах.',                             'errors', 'Админка — ошибка удаления'),
  ('error.admin_upload',       'Ошибка загрузки файла. Поддерживаются JPG, PNG, WebP до 10 МБ.',                                   'errors', 'Админка — ошибка загрузки файла')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- VALIDATION MESSAGES
-- Источник: content/empty-states.ts:errorMessages.formValidation
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('validation.name_required',       'Укажите, как к вам обращаться',                                 'validation', 'Имя — обязательное'),
  ('validation.phone_required',      'Нужен номер телефона, чтобы перезвонить',                       'validation', 'Телефон — обязательный'),
  ('validation.phone_invalid',       'Проверьте номер — должен начинаться с +7 или 8',                'validation', 'Телефон — некорректный формат'),
  ('validation.email_invalid',       'Похоже, в email допущена ошибка',                               'validation', 'Email — некорректный'),
  ('validation.message_required',    'Напишите кратко о задаче',                                      'validation', 'Сообщение — обязательное'),
  ('validation.agreement_required',  'Нужно согласие на обработку персональных данных',               'validation', 'ПД-согласие — обязательное')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PLACEHOLDERS
-- Источник: content/empty-states.ts:placeholders
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('placeholder.name',    'Ваше имя',                                                  'placeholders', 'Плейсхолдер — имя'),
  ('placeholder.phone',   '+7 (___) ___-__-__',                                        'placeholders', 'Плейсхолдер — телефон'),
  ('placeholder.email',   'email@example.com',                                          'placeholders', 'Плейсхолдер — email'),
  ('placeholder.company', 'Название компании (необязательно)',                          'placeholders', 'Плейсхолдер — название компании'),
  ('placeholder.task',    'Опишите вашу задачу — что, куда, к какому сроку',            'placeholders', 'Плейсхолдер — задача'),
  ('placeholder.search',  'Поиск: визитки, вывеска, баннер...',                         'placeholders', 'Плейсхолдер — поиск'),
  ('placeholder.city',    'Ваш город',                                                  'placeholders', 'Плейсхолдер — город'),
  ('placeholder.inn',     'ИНН (для юридических лиц)',                                  'placeholders', 'Плейсхолдер — ИНН'),
  ('placeholder.comment', 'Дополнительный комментарий',                                 'placeholders', 'Плейсхолдер — комментарий')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- AGREEMENTS
-- Источник: content/empty-states.ts:agreementLabels
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('agreement.privacy_markdown', 'Нажимая кнопку, я соглашаюсь с [политикой конфиденциальности](/privacy) и даю согласие на обработку персональных данных.', 'agreements', 'Соглашение под формами обратной связи. Ссылка парсится как markdown.')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- BUTTON LABELS
-- Источник: content/empty-states.ts:buttonLabels
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('button.get_quote',       'Получить расчёт',          'buttons', 'CTA — получить расчёт'),
  ('button.order',           'Заказать',                 'buttons', 'CTA — заказать'),
  ('button.view_portfolio',  'Наши работы',              'buttons', 'CTA — портфолио'),
  ('button.call_us',         'Позвонить',                'buttons', 'CTA — позвонить'),
  ('button.write_telegram',  'Написать в Telegram',      'buttons', 'CTA — написать в Telegram'),
  ('button.go_to_catalog',   'В каталог',                'buttons', 'CTA — в каталог'),
  ('button.back_home',       'На главную',               'buttons', 'CTA — на главную'),
  ('button.send',            'Отправить',                'buttons', 'Форма — отправить'),
  ('button.sending',         'Отправляем…',              'buttons', 'Форма — идёт отправка'),
  ('button.sent',            'Отправлено',               'buttons', 'Форма — отправлено'),
  ('button.retry',           'Попробовать ещё раз',      'buttons', 'Форма — повторить'),
  ('button.more_details',    'Подробнее',                'buttons', 'CTA — подробнее'),
  ('button.save',            'Сохранить',                'buttons', 'Админка — сохранить'),
  ('button.saving',          'Сохраняем…',               'buttons', 'Админка — идёт сохранение'),
  ('button.cancel',          'Отменить',                 'buttons', 'Админка — отменить'),
  ('button.add',             'Добавить',                 'buttons', 'Админка — добавить'),
  ('button.edit',            'Редактировать',            'buttons', 'Админка — редактировать'),
  ('button.delete',          'Удалить',                  'buttons', 'Админка — удалить'),
  ('button.publish',         'Опубликовать',             'buttons', 'Админка — опубликовать'),
  ('button.unpublish',       'Снять с публикации',       'buttons', 'Админка — снять с публикации'),
  ('button.upload_photo',    'Загрузить фото',           'buttons', 'Админка — загрузить фото'),
  ('button.change_photo',    'Изменить фото',            'buttons', 'Админка — изменить фото')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- FORMS — ContactForm (страница /contacts)
-- Источник: components/sections/contacts/ContactForm.tsx
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('form.contact.name_label',         'Имя *',                                      'forms', 'ContactForm — label имени'),
  ('form.contact.name_placeholder',   'Ваше имя',                                   'forms', 'ContactForm — placeholder имени'),
  ('form.contact.phone_label',        'Телефон *',                                  'forms', 'ContactForm — label телефона'),
  ('form.contact.phone_placeholder',  '+7 (900) 000-00-00',                         'forms', 'ContactForm — placeholder телефона'),
  ('form.contact.email_label',        'Email',                                      'forms', 'ContactForm — label email'),
  ('form.contact.email_placeholder',  'your@email.ru',                              'forms', 'ContactForm — placeholder email'),
  ('form.contact.service_label',      'Услуга',                                     'forms', 'ContactForm — label услуги'),
  ('form.contact.service_default_option', 'Выберите услугу',                        'forms', 'ContactForm — option "Выберите услугу"'),
  ('form.contact.service_polygraphy', 'Полиграфия',                                 'forms', 'ContactForm — option Полиграфия'),
  ('form.contact.service_outdoor',    'Наружная реклама',                           'forms', 'ContactForm — option Наружная реклама'),
  ('form.contact.service_facades',    'Оформление фасадов',                         'forms', 'ContactForm — option Оформление фасадов'),
  ('form.contact.service_other',      'Другое',                                     'forms', 'ContactForm — option Другое'),
  ('form.contact.message_label',      'Опишите вашу задачу *',                      'forms', 'ContactForm — label текстового поля'),
  ('form.contact.message_placeholder','Что нужно сделать, какие сроки, есть ли референсы...', 'forms', 'ContactForm — placeholder задачи'),
  ('form.contact.submit_label',       'Отправить заявку',                           'forms', 'ContactForm — кнопка отправки'),
  ('form.contact.submit_sending',     'Отправляем...',                              'forms', 'ContactForm — кнопка в процессе'),
  ('form.contact.success_title',      'Заявка отправлена!',                         'forms', 'ContactForm — заголовок успеха'),
  ('form.contact.success_text',       'Перезвоним в течение часа в рабочее время.', 'forms', 'ContactForm — текст успеха'),
  ('form.contact.success_retry',      'Отправить ещё',                              'forms', 'ContactForm — кнопка "Отправить ещё"'),
  ('form.contact.error_text',         'Ошибка отправки. Позвоните нам:',            'forms', 'ContactForm — текст ошибки (до номера телефона)')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- MODALS — QuoteModal / OneClickModal
-- Источник: components/shop/modals/QuoteModal.tsx, OneClickModal.tsx
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  -- QuoteModal
  ('modal.quote.title',            'Получить расчёт',                                                   'modals', 'QuoteModal — заголовок'),
  ('modal.quote.description',      'Оставьте заявку — пришлём расчёт и образцы в течение часа.',       'modals', 'QuoteModal — подзаголовок'),
  ('modal.quote.name_label',       'Ваше имя',                                                         'modals', 'QuoteModal — label имени'),
  ('modal.quote.phone_label',      'Телефон',                                                          'modals', 'QuoteModal — label телефона'),
  ('modal.quote.email_label',      'Email (необязательно)',                                            'modals', 'QuoteModal — label email'),
  ('modal.quote.company_label',    'Компания (для юрлиц)',                                             'modals', 'QuoteModal — label компании'),
  ('modal.quote.comment_label',    'Опишите вашу задачу',                                              'modals', 'QuoteModal — label комментария'),
  ('modal.quote.name_placeholder', 'Иван Иванов',                                                       'modals', 'QuoteModal — placeholder имени'),
  ('modal.quote.phone_placeholder','+7 (___) ___-__-__',                                                'modals', 'QuoteModal — placeholder телефона'),
  ('modal.quote.submit_label',     'Отправить заявку',                                                  'modals', 'QuoteModal — кнопка отправки'),
  ('modal.quote.sending_label',    'Отправляем…',                                                       'modals', 'QuoteModal — в процессе'),
  ('modal.quote.success_message',  'Заявка отправлена. Менеджер свяжется в течение часа — в рабочие дни с 9:00 до 19:00.', 'modals', 'QuoteModal — toast успеха'),
  ('modal.quote.error_message',    'Не удалось отправить заявку. Позвоните нам напрямую.',              'modals', 'QuoteModal — toast ошибки'),

  -- OneClickModal
  ('modal.oneclick.title',            'Заказать в 1 клик',                                              'modals', 'OneClickModal — заголовок'),
  ('modal.oneclick.description',      'Оставьте имя и телефон — перезвоним в течение 15 минут.',       'modals', 'OneClickModal — подзаголовок'),
  ('modal.oneclick.name_label',       'Ваше имя',                                                      'modals', 'OneClickModal — label имени'),
  ('modal.oneclick.phone_label',      'Телефон',                                                       'modals', 'OneClickModal — label телефона'),
  ('modal.oneclick.product_label',    'Услуга',                                                        'modals', 'OneClickModal — label услуги'),
  ('modal.oneclick.name_placeholder', 'Иван Иванов',                                                    'modals', 'OneClickModal — placeholder имени'),
  ('modal.oneclick.phone_placeholder','+7 (___) ___-__-__',                                             'modals', 'OneClickModal — placeholder телефона'),
  ('modal.oneclick.product_placeholder', 'Визитки 1000 шт',                                             'modals', 'OneClickModal — placeholder услуги'),
  ('modal.oneclick.submit_label',     'Заказать звонок',                                                'modals', 'OneClickModal — кнопка отправки'),
  ('modal.oneclick.success_message',  'Заявка принята. Перезвоним в течение 15 минут.',                 'modals', 'OneClickModal — toast успеха'),
  ('modal.oneclick.error_message',    'Не удалось отправить заявку. Позвоните нам напрямую.',           'modals', 'OneClickModal — toast ошибки')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PROMO POPUP (верхний баннер акций)
-- Источник: components/shop/PromoPopupBanner.tsx
-- ═══════════════════════════════════════════════════════════
INSERT INTO ui_strings (key, value, namespace, description) VALUES
  ('promo_popup.cta_default',        'Подробнее',                                                      'modals', 'PromoPopupBanner — дефолтный текст кнопки'),
  ('promo_popup.close_aria_label',   'Закрыть баннер акции',                                           'modals', 'PromoPopupBanner — aria-label закрытия')
ON CONFLICT (key) DO NOTHING;

COMMIT;
