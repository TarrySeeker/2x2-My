/**
 * @vitest-environment jsdom
 *
 * Unit-тесты для UiStringsProvider + хука useUiString.
 *
 * Тест рендерит маленькие client-only компоненты через renderToString
 * (он умеет работать с useContext) и проверяет:
 *   - возврат значения из dict, когда ключ есть
 *   - fallback, когда ключа нет
 *   - fallback, когда провайдер не подключён
 *   - fallback, когда значение = пустая строка
 *   - useUiStrings: batch + пер-ключевые fallbacks
 */
import { describe, it, expect } from "vitest";
import * as React from "react";
import { renderToString } from "react-dom/server";

import {
  UiStringsProvider,
  useUiString,
  useUiStrings,
  useUiStringsSnapshot,
} from "@/features/cms/UiStringsProvider";

function Probe({
  k,
  fallback,
}: {
  k: string;
  fallback?: string;
}): React.JSX.Element {
  const v = useUiString(k, fallback);
  return <span data-testid="probe">{v}</span>;
}

function BatchProbe(): React.JSX.Element {
  const dict = useUiStrings(
    ["a.b", "x.y", "missing.key"] as const,
    { "missing.key": "FB-MISS" },
  );
  return (
    <span data-testid="probe">
      {dict["a.b"]}|{dict["x.y"]}|{dict["missing.key"]}
    </span>
  );
}

function SnapshotProbe(): React.JSX.Element {
  const snap = useUiStringsSnapshot();
  return <span data-testid="probe">{Object.keys(snap).sort().join(",")}</span>;
}

describe("UiStringsProvider + useUiString", () => {
  it("возвращает строку из словаря, когда ключ найден", () => {
    const html = renderToString(
      <UiStringsProvider strings={{ "error.catalog.title": "Из БД" }}>
        <Probe k="error.catalog.title" fallback="FB" />
      </UiStringsProvider>,
    );
    expect(html).toContain("Из БД");
    expect(html).not.toContain("FB");
  });

  it("возвращает fallback, когда ключа нет в словаре", () => {
    const html = renderToString(
      <UiStringsProvider strings={{ "other.key": "x" }}>
        <Probe k="error.catalog.title" fallback="FB-CATALOG" />
      </UiStringsProvider>,
    );
    expect(html).toContain("FB-CATALOG");
  });

  it("возвращает fallback, когда значение в словаре пустое", () => {
    const html = renderToString(
      <UiStringsProvider strings={{ "error.catalog.title": "" }}>
        <Probe k="error.catalog.title" fallback="FB-EMPTY" />
      </UiStringsProvider>,
    );
    expect(html).toContain("FB-EMPTY");
  });

  it("возвращает fallback при отсутствии провайдера (страховка)", () => {
    const html = renderToString(<Probe k="any.key" fallback="FB-NO-PROV" />);
    expect(html).toContain("FB-NO-PROV");
  });

  it("без fallback возвращает пустую строку, если ключа нет", () => {
    const html = renderToString(
      <UiStringsProvider strings={{}}>
        <Probe k="missing" />
      </UiStringsProvider>,
    );
    // probe span с пустым контентом
    expect(html).toContain('data-testid="probe"');
    // В отрендеренном HTML не должно быть мусора, кроме пустого span
    expect(html.replace(/<[^>]+>/g, "")).toBe("");
  });
});

/** React при рендере соседних строк вставляет `<!-- -->` маркеры. */
function stripHtml(s: string): string {
  return s.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "");
}

describe("useUiStrings (batch)", () => {
  it("читает несколько ключей и применяет per-key fallback для отсутствующих", () => {
    const html = renderToString(
      <UiStringsProvider
        strings={{
          "a.b": "AAA",
          "x.y": "XXX",
        }}
      >
        <BatchProbe />
      </UiStringsProvider>,
    );
    expect(stripHtml(html)).toBe("AAA|XXX|FB-MISS");
  });

  it("если оба и dict, и fallback пустые — возвращает '' для каждого", () => {
    const html = renderToString(
      <UiStringsProvider strings={{}}>
        <BatchProbe />
      </UiStringsProvider>,
    );
    // только missing.key имеет fallback, остальные = ''
    expect(stripHtml(html)).toBe("||FB-MISS");
  });
});

describe("useUiStringsSnapshot", () => {
  it("отдаёт весь snapshot целиком", () => {
    const html = renderToString(
      <UiStringsProvider strings={{ z: "1", a: "2" }}>
        <SnapshotProbe />
      </UiStringsProvider>,
    );
    // отсортированные ключи
    expect(html).toContain("a,z");
  });

  it("без провайдера отдаёт пустой объект", () => {
    const html = renderToString(<SnapshotProbe />);
    // сортированный список ключей пуст -> пустой span
    expect(html.replace(/<[^>]+>/g, "")).toBe("");
  });
});
