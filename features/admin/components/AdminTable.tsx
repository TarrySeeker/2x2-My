"use client";

import { type ReactNode } from "react";
import {
  flexRender,
  type Table as TanTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

interface AdminTableProps<T> {
  table: TanTable<T>;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  onRowClick?: (row: T) => void;
}

export default function AdminTable<T>({
  table,
  emptyMessage = "Нет данных",
  emptyIcon,
  onRowClick,
}: AdminTableProps<T>) {
  const rows = table.getRowModel().rows;

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-neutral-100 bg-neutral-50 dark:border-white/5 dark:bg-white/[0.02]"
              >
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400"
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={table.getAllColumns().length}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-500">
                    {emptyIcon}
                    <p>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={clsx(
                    "border-b border-neutral-100 transition-colors last:border-b-0 dark:border-white/5",
                    "hover:bg-neutral-50 dark:hover:bg-white/[0.02]",
                    onRowClick && "cursor-pointer",
                    row.getIsSelected() &&
                      "bg-brand-orange/5 dark:bg-brand-orange/10",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 text-brand-dark dark:text-neutral-200"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-white/5">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Страница {table.getState().pagination.pageIndex + 1} из{" "}
            {table.getPageCount()}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label="Предыдущая страница"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-white/10"
              aria-label="Следующая страница"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
