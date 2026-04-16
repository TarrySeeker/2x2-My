import { type ReactNode } from "react";
import clsx from "clsx";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export default function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
