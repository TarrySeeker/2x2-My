import "server-only";

import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

/**
 * Server-side HTML-санитайзер для контента TipTap.
 *
 * Используется во всех server actions, которые принимают HTML от
 * админа (blog posts, pages). Защищает от XSS — даже если злоумышленник
 * положит `<script>` или `onerror=`, мы вырежем перед сохранением в БД.
 *
 * Используем `dompurify` поверх `jsdom` — официальный рекомендованный
 * способ для Node.js. Альтернатива `isomorphic-dompurify` не нужна:
 * у нас обе зависимости уже стоят (`dompurify` для клиента, `jsdom`
 * для тестов).
 *
 * Whitelist:
 *  - стандартный профиль `html` (включает p, b, i, u, h1-h6, ul, ol,
 *    li, a, blockquote, code, pre, table, …)
 *  - дополнительно `target` и `rel` для ссылок (TipTap ставит
 *    `target="_blank" rel="noopener noreferrer"`).
 *  - запрещаем <script>, <style>, <iframe>, <object>, <embed>.
 *  - запрещаем on* атрибуты.
 */

let cachedSanitizer: ReturnType<typeof createDOMPurify> | null = null;

function getSanitizer(): ReturnType<typeof createDOMPurify> {
  if (cachedSanitizer) return cachedSanitizer;
  // Создаём JSDOM-окно один раз; sanitizer кешируется.
  const window = new JSDOM("").window;
  // pnpm создаёт несколько физических копий @types/trusted-types
  // (одинаковая версия 2.0.7, но в разных директориях — у dompurify своя,
  // у jsdom своя). TypeScript считает их структурно разными из-за приватного
  // поля `brand` в TrustedHTML. Override в package.json не помогает, т.к.
  // dompurify уже опубликовал свои types-зависимости. Прокидываем как
  // unknown — runtime-поведение корректно, оба пакета используют один и
  // тот же интерфейс Window.
  cachedSanitizer = createDOMPurify(
    window as unknown as Parameters<typeof createDOMPurify>[0],
  );
  return cachedSanitizer;
}

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const sanitizer = getSanitizer();
  return sanitizer.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: [
      "onerror",
      "onclick",
      "onload",
      "onmouseover",
      "onmouseout",
      "onmouseenter",
      "onmouseleave",
      "onfocus",
      "onblur",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onkeyup",
      "onkeypress",
      "formaction",
      "srcdoc",
    ],
  });
}
