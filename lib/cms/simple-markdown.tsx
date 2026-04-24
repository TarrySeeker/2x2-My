/**
 * Простой markdown-рендерер для CMS `page_content` (legal-страниц).
 *
 * Почему не `react-markdown` / `marked`: обе библиотеки не в стеке
 * проекта (см. package.json), и для legal-страниц нам нужен очень
 * ограниченный подмножество markdown. Поэтому встроен минимальный
 * рендер с белым списком:
 *   - `## Заголовок` → <h2>
 *   - `### Заголовок` → <h3>
 *   - строки, начинающиеся с `- ` → группируются в <ul><li>
 *   - пустые строки разделяют абзацы
 *   - inline: `**bold**`, `[text](url)`, автоссылки `<mailto:…>`, `<tel:…>`
 *
 * Всё остальное трактуется как обычный текст. Весь HTML экранируется —
 * прямые теги вводить нельзя (защита от XSS, хотя markdown заполняет
 * только авторизованный контент-менеджер).
 */
import React from "react";
import Link from "next/link";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Возвращает React-ноды для строки inline-markdown.
 * Поддержка: **bold**, [text](url), <mailto:…>, <tel:…>, <https://…>
 */
function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  // Regex, который ловит первый токен:
  //   bold       **…**
  //   link       [text](url)
  //   autolink   <mailto:…> | <tel:…> | <http(s)://…>
  const RE =
    /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)|<(mailto:[^>]+|tel:[^>]+|https?:\/\/[^>]+)>/;
  let rest = line;
  let idx = 0;
  while (rest.length > 0) {
    const m = RE.exec(rest);
    if (!m) {
      out.push(escape(rest));
      break;
    }
    const before = rest.slice(0, m.index);
    if (before.length > 0) out.push(escape(before));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyPrefix}-b-${idx}`}>{escape(m[1])}</strong>);
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const text = m[2];
      const href = m[3];
      out.push(renderLink(text, href, `${keyPrefix}-l-${idx}`));
    } else if (m[4] !== undefined) {
      const href = m[4];
      let label = href;
      if (href.startsWith("mailto:")) label = href.slice(7);
      else if (href.startsWith("tel:")) label = href.slice(4);
      out.push(renderLink(label, href, `${keyPrefix}-a-${idx}`));
    }
    rest = rest.slice(m.index + m[0].length);
    idx += 1;
  }
  return out;
}

function renderLink(text: string, href: string, key: string): React.ReactNode {
  const isExternal =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");
  if (isExternal) {
    return (
      <a
        key={key}
        href={href}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {escape(text)}
      </a>
    );
  }
  return (
    <Link key={key} href={href}>
      {escape(text)}
    </Link>
  );
}

interface Block {
  type: "h2" | "h3" | "p" | "ul";
  lines: string[];
}

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const raw = md.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  const n = raw.length;
  while (i < n) {
    const line = raw[i]!;
    // пустая строка — сепаратор
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    // заголовки
    if (line.startsWith("## ")) {
      blocks.push({ type: "h2", lines: [line.slice(3).trim()] });
      i += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", lines: [line.slice(4).trim()] });
      i += 1;
      continue;
    }
    // списки
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < n && raw[i]?.startsWith("- ")) {
        items.push(raw[i]!.slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "ul", lines: items });
      continue;
    }
    // абзац — собираем смежные строки (пока не встретим пустую или заголовок/список)
    const paraLines: string[] = [line];
    i += 1;
    while (
      i < n &&
      raw[i]!.trim() !== "" &&
      !raw[i]!.startsWith("## ") &&
      !raw[i]!.startsWith("### ") &&
      !raw[i]!.startsWith("- ")
    ) {
      paraLines.push(raw[i]!);
      i += 1;
    }
    blocks.push({ type: "p", lines: [paraLines.join(" ")] });
  }
  return blocks;
}

export function renderSimpleMarkdown(md: string): React.ReactNode {
  const blocks = parseBlocks(md);
  return (
    <>
      {blocks.map((b, i) => {
        const key = `b-${i}`;
        if (b.type === "h2") {
          return <h2 key={key}>{renderInline(b.lines[0]!, key)}</h2>;
        }
        if (b.type === "h3") {
          return <h3 key={key}>{renderInline(b.lines[0]!, key)}</h3>;
        }
        if (b.type === "ul") {
          return (
            <ul key={key}>
              {b.lines.map((li, li_i) => (
                <li key={`${key}-${li_i}`}>{renderInline(li, `${key}-${li_i}`)}</li>
              ))}
            </ul>
          );
        }
        return <p key={key}>{renderInline(b.lines[0]!, key)}</p>;
      })}
    </>
  );
}
