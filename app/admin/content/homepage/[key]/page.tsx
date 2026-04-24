import { notFound } from "next/navigation";

import { getSection } from "@/lib/data/cms";
import {
  isValidSectionKey,
  getSectionSchema,
  type SectionKey,
} from "@/features/admin/schemas/cms";
import HomepageSectionEditor from "@/features/admin/components/HomepageSectionEditor";

interface PageProps {
  params: Promise<{ key: string }>;
}

export const metadata = { title: "Редактирование секции" };

export default async function HomepageSectionEditPage({ params }: PageProps) {
  const { key } = await params;
  if (!isValidSectionKey(key)) notFound();
  const sectionKey: SectionKey = key;

  const stored = await getSection(sectionKey);
  const schema = getSectionSchema(sectionKey);
  // Парсим текущее содержимое через схему — получаем уже нормализованные
  // дефолты для пустых полей. Если в БД ничего нет — используем парс
  // пустого объекта (схемы сами раздают .default()).
  const parsed = schema.safeParse(stored?.content ?? {});
  const initialContent: unknown = parsed.success ? parsed.data : {};

  return (
    <HomepageSectionEditor
      sectionKey={sectionKey}
      initialContent={initialContent}
      lastUpdatedAt={stored?.updatedAt ?? null}
    />
  );
}
