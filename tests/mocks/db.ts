/**
 * Reusable mock for `lib/db/client.ts` — postgres-js `sql` template tag.
 *
 * postgres-js используется как template literal:
 *   const rows = await sql`SELECT … WHERE id = ${id}`;
 *
 * Мы возвращаем `vi.fn()`, который можно настраивать в каждом тесте
 * через `mockSql.mockResolvedValueOnce([...])` — порядок вызовов
 * совпадает с порядком реальных запросов в коде.
 *
 * Использование (внутри test-файла):
 *   import { mockSql, resetSqlMock } from "../mocks/db";
 *   beforeEach(() => resetSqlMock());
 *   it("…", () => {
 *     mockSql.mockResolvedValueOnce([{ id: 1 }]);  // первый SELECT
 *     mockSql.mockResolvedValueOnce([]);            // следующий запрос
 *     …
 *   });
 *
 * ВАЖНО: vi.mock работает на уровне модуля — этот файл должен быть
 * импортирован ДО кода, который дёргает `@/lib/db/client`. Vitest
 * хойстит vi.mock в начало, так что обычно достаточно простого import.
 */
import { vi } from "vitest";

type SqlMock = ReturnType<typeof vi.fn> & {
  unsafe: ReturnType<typeof vi.fn>;
  begin: ReturnType<typeof vi.fn>;
  end: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

function createSqlMock(): SqlMock {
  const m = vi.fn() as SqlMock;
  m.unsafe = vi.fn();
  m.begin = vi.fn(async (cb: (sql: SqlMock) => unknown) => cb(m));
  m.end = vi.fn(async () => undefined);
  // postgres-js: sql.json(value) → JSON-обёртка для safe-инъекции в JSONB
  // колонку. В тестах достаточно вернуть исходное значение — реальная
  // сериализация не нужна (мы не пишем в реальную БД).
  m.json = vi.fn((value: unknown) => value);
  return m;
}

export const mockSql: SqlMock = createSqlMock();

export function resetSqlMock(): void {
  mockSql.mockReset();
  mockSql.unsafe.mockReset();
  mockSql.begin.mockReset();
  mockSql.begin.mockImplementation(async (cb: (sql: SqlMock) => unknown) =>
    cb(mockSql),
  );
  mockSql.end.mockReset();
  mockSql.json.mockReset();
  mockSql.json.mockImplementation((value: unknown) => value);
}

vi.mock("@/lib/db/client", () => ({
  sql: mockSql,
}));
