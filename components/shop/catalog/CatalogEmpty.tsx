import Link from "next/link";
import { Compass } from "lucide-react";
import Button from "@/components/ui/Button";

type CatalogEmptyProps = {
  resetHref?: string;
};

export default function CatalogEmpty({ resetHref = "/catalog" }: CatalogEmptyProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-neutral-300 bg-white/60 px-6 py-16 text-center">
      <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-orange/10 text-brand-orange">
        <Compass className="h-8 w-8" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-bold text-brand-dark">
          По вашему запросу пока пусто
        </h2>
        <p className="max-w-md text-sm text-neutral-600">
          Попробуйте снять часть фильтров или позвоните нам —
          в каталоге «2х2» больше 200 услуг, что-то подберём
          индивидуально под задачу и ваш бюджет.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button href={resetHref} variant="outline" size="md">
          Сбросить фильтры
        </Button>
        <Link
          href="tel:+79324247740"
          className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600"
        >
          Позвонить +7 (932) 424-77-40
        </Link>
      </div>
    </div>
  );
}
