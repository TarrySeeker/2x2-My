import Link from "next/link";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";

type Crumb = { label: string; href?: string };

type BreadcrumbsProps = {
  items: Crumb[];
  className?: string;
};

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Хлебные крошки"
      className={clsx("flex flex-wrap items-center gap-1 text-sm", className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={index} className="inline-flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-neutral-500 transition-colors hover:text-brand-orange"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={clsx(
                  isLast ? "font-semibold text-brand-dark" : "text-neutral-500",
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight className="h-4 w-4 text-neutral-300" aria-hidden />
            )}
          </span>
        );
      })}
    </nav>
  );
}
