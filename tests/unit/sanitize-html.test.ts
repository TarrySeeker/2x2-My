/**
 * @vitest-environment node
 *
 * Unit-тесты для server-side HTML-санитайзера `lib/sanitize/html.ts`.
 * Цель: гарантировать что XSS-вектор от админа (через TipTap) обрезается
 * перед записью в БД (P1-6).
 *
 * Запускаем в node-окружении, потому что dompurify+jsdom инициализирует
 * собственное окно и не дружит с jsdom-default из vitest.
 */
import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize/html";

describe("sanitizeHtml — basic invariants", () => {
  it("пустой/невалидный input возвращает ''", () => {
    expect(sanitizeHtml("")).toBe("");
    // @ts-expect-error — намеренно не string
    expect(sanitizeHtml(null)).toBe("");
    // @ts-expect-error — намеренно не string
    expect(sanitizeHtml(undefined)).toBe("");
  });

  it("оставляет безопасные теги (p, b, ul, h2, blockquote)", () => {
    const html =
      "<h2>Заголовок</h2><p><b>Жирный</b> текст</p><ul><li>один</li></ul><blockquote>Q</blockquote>";
    const out = sanitizeHtml(html);
    expect(out).toContain("<h2>");
    expect(out).toContain("<b>");
    expect(out).toContain("<ul>");
    expect(out).toContain("<blockquote>");
  });
});

describe("sanitizeHtml — XSS защита", () => {
  it("вырезает <script>", () => {
    const html = "<p>before</p><script>alert(1)</script><p>after</p>";
    const out = sanitizeHtml(html);
    expect(out).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
    expect(out).toContain("before");
    expect(out).toContain("after");
  });

  it("вырезает onerror в img", () => {
    const html = `<img src="x" onerror="alert(1)" />`;
    const out = sanitizeHtml(html);
    expect(out).not.toMatch(/onerror/i);
    expect(out).not.toContain("alert(1)");
  });

  it("вырезает javascript: в href", () => {
    const html = `<a href="javascript:alert(1)">click</a>`;
    const out = sanitizeHtml(html);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("вырезает <iframe>", () => {
    const html = `<iframe src="https://evil.example/bad"></iframe>`;
    expect(sanitizeHtml(html)).not.toContain("<iframe");
  });

  it("вырезает <style>", () => {
    const html = `<style>body{display:none}</style><p>hi</p>`;
    const out = sanitizeHtml(html);
    expect(out).not.toContain("<style");
    expect(out).toContain("hi");
  });

  it("вырезает on*-обработчики (onclick, onmouseover, onfocus)", () => {
    const html =
      `<a href="/x" onclick="alert(1)" onmouseover="alert(2)">x</a>` +
      `<input onfocus="alert(3)" />`;
    const out = sanitizeHtml(html);
    expect(out).not.toMatch(/onclick/i);
    expect(out).not.toMatch(/onmouseover/i);
    expect(out).not.toMatch(/onfocus/i);
  });

  it("вырезает <form> (запрещён по конфигу)", () => {
    const html = `<form action="/evil"><input name="x"/></form>`;
    expect(sanitizeHtml(html)).not.toContain("<form");
  });
});

describe("sanitizeHtml — TipTap-friendly", () => {
  it("сохраняет target='_blank' rel='noopener noreferrer' на ссылках", () => {
    const html = `<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>`;
    const out = sanitizeHtml(html);
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain("noopener");
  });
});
