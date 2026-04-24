import {
  getPageContentRaw,
} from "@/lib/data/page-content";
import { PAGE_CONTENT_ALLOWED_PATHS } from "@/features/admin/schemas/page-content";
import LegalPagesClient, {
  type LegalPageRow,
} from "@/features/admin/components/LegalPagesClient";

export const metadata = { title: "Правовые страницы" };

const PATH_META: Record<
  string,
  { label: string; defaultTitle: string; description: string }
> = {
  "/privacy": {
    label: "Политика конфиденциальности",
    defaultTitle: "Политика конфиденциальности",
    description: "Обязательна по 152-ФЗ. Используется на /privacy.",
  },
  "/terms": {
    label: "Условия использования",
    defaultTitle: "Условия использования",
    description: "Пользовательское соглашение. Используется на /terms.",
  },
  "/offer": {
    label: "Публичная оферта",
    defaultTitle: "Публичная оферта",
    description: "Договор оферты. Используется на /offer.",
  },
};

export default async function LegalPagesAdminPage() {
  const rows: LegalPageRow[] = await Promise.all(
    PAGE_CONTENT_ALLOWED_PATHS.map(async (path) => {
      const raw = await getPageContentRaw(path);
      const meta = PATH_META[path] ?? {
        label: path,
        defaultTitle: path,
        description: "",
      };
      return {
        path,
        label: meta.label,
        description: meta.description,
        title: raw?.title ?? meta.defaultTitle,
        contentMarkdown: raw?.contentMarkdown ?? "",
        version: raw?.version ?? 0,
        published: raw?.published ?? true,
        updatedAt: raw?.updatedAt ?? null,
        exists: Boolean(raw),
      };
    }),
  );

  return <LegalPagesClient rows={rows} />;
}
