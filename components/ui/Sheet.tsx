"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";
import { tokens } from "@/styles/tokens";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  side?: "bottom" | "right";
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

/**
 * Bottom/right sheet — кастомная реализация без Radix. На мобиле используется
 * для фильтров каталога (side="bottom").
 */
export default function Sheet({
  open,
  onClose,
  side = "bottom",
  title,
  children,
  footer,
  className,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const fromVariants =
    side === "bottom"
      ? { hidden: { y: "100%" }, visible: { y: 0 } }
      : { hidden: { x: "100%" }, visible: { x: 0 } };

  const panelPositionClass =
    side === "bottom"
      ? "fixed inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl"
      : "fixed right-0 top-0 bottom-0 w-full max-w-md rounded-l-2xl";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[55] bg-brand-dark/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "sheet-title" : undefined}
            className={clsx(
              "z-[60] flex flex-col bg-white shadow-2xl",
              panelPositionClass,
              className,
            )}
            variants={fromVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{
              duration: reduce ? 0 : 0.35,
              ease: tokens.easings.softOut,
            }}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
              <h2
                id="sheet-title"
                className="font-display text-xl font-bold text-brand-dark"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <div className="border-t border-neutral-100 bg-white/95 px-6 py-4 backdrop-blur-md">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
