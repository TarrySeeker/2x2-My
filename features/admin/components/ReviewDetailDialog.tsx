"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Star,
  Check,
  XCircle,
  Send,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import type { AdminReview } from "@/features/admin/api/reviews";
import {
  approveReviewAction,
  rejectReviewAction,
  replyToReviewAction,
} from "@/features/admin/actions/reviews";

interface ReviewDetailDialogProps {
  open: boolean;
  onClose: () => void;
  review: AdminReview | null;
  onModerated: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={clsx(
            "h-4 w-4",
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-neutral-300 dark:text-neutral-600",
          )}
        />
      ))}
    </div>
  );
}

export default function ReviewDetailDialog({
  open,
  onClose,
  review,
  onModerated,
}: ReviewDetailDialogProps) {
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [moderating, setModerating] = useState<"approve" | "reject" | null>(
    null,
  );

  // Reset reply text when review changes
  useEffect(() => {
    if (review) {
      setReplyText(review.admin_reply ?? "");
    }
  }, [review]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!review) return null;

  async function handleApprove() {
    setModerating("approve");
    try {
      const result = await approveReviewAction(review!.id);
      if (result.success) {
        toast.success("Отзыв одобрен");
        onModerated();
        onClose();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка одобрения");
    } finally {
      setModerating(null);
    }
  }

  async function handleReject() {
    setModerating("reject");
    try {
      const result = await rejectReviewAction(review!.id);
      if (result.success) {
        toast.success("Отзыв отклонён");
        onModerated();
        onClose();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка отклонения");
    } finally {
      setModerating(null);
    }
  }

  async function handleSaveReply() {
    if (!replyText.trim()) {
      toast.error("Введите ответ");
      return;
    }
    setSaving(true);
    try {
      const result = await replyToReviewAction({
        id: review!.id,
        reply: replyText.trim(),
      });
      if (result.success) {
        toast.success("Ответ сохранён");
        onModerated();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка сохранения ответа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-xl",
              "bg-white dark:bg-neutral-900 dark:border dark:border-white/10",
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-brand-dark dark:text-white">
                  Отзыв #{review.id}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {new Date(review.created_at).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Rating + Author */}
            <div className="flex items-center gap-4 mb-5">
              <StarRating rating={review.rating} />
              <div className="text-sm">
                <span className="font-semibold text-brand-dark dark:text-white">
                  {review.author_name}
                </span>
                {review.author_email && (
                  <span className="ml-2 text-neutral-500">
                    {review.author_email}
                  </span>
                )}
                {review.author_company && (
                  <span className="ml-2 text-neutral-400">
                    ({review.author_company})
                  </span>
                )}
              </div>
            </div>

            {/* Product link */}
            {review.product_name && (
              <div className="mb-5 flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-white/10">
                {review.product_image && (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/10">
                    <Image
                      src={review.product_image}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark dark:text-white">
                    {review.product_name}
                  </p>
                </div>
                {review.product_slug && (
                  <Link
                    href={`/catalog/${review.product_slug}`}
                    target="_blank"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
                    title="Открыть товар"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}

            {/* Review title */}
            {review.title && (
              <h3 className="mb-2 text-base font-semibold text-brand-dark dark:text-white">
                {review.title}
              </h3>
            )}

            {/* Review text */}
            {review.text && (
              <p className="mb-4 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                {review.text}
              </p>
            )}

            {/* Pros & Cons */}
            {(review.pros || review.cons) && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {review.pros && (
                  <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Плюсы
                    </div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                      {review.pros}
                    </p>
                  </div>
                )}
                {review.cons && (
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400">
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Минусы
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {review.cons}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Photos */}
            {review.images && review.images.length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Фото
                </p>
                <div className="flex flex-wrap gap-2">
                  {review.images.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative h-20 w-20 overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-black/5 transition-transform hover:scale-105 dark:bg-white/10 dark:ring-white/10"
                    >
                      <Image
                        src={url}
                        alt={`Фото ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin reply */}
            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Ответ администратора
              </label>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Введите ответ на отзыв..."
                className={clsx(
                  "w-full rounded-lg border bg-transparent px-3 py-2.5 text-sm outline-none transition-colors resize-none",
                  "border-neutral-200 hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
                  "dark:border-white/10 dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-white/20 dark:focus:border-brand-orange",
                )}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveReply}
                  disabled={saving || !replyText.trim()}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Сохранить ответ
                </button>
              </div>
            </div>

            {/* Moderation buttons */}
            {review.status === "pending" && (
              <div className="flex justify-end gap-3 border-t border-neutral-200 pt-4 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={moderating !== null}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {moderating === "reject" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Отклонить
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={moderating !== null}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                >
                  {moderating === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Одобрить
                </button>
              </div>
            )}

            {/* For non-pending: show status */}
            {review.status !== "pending" && (
              <div className="flex items-center justify-between border-t border-neutral-200 pt-4 dark:border-white/10">
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    review.status === "approved"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
                  )}
                >
                  {review.status === "approved" ? "Одобрен" : "Отклонён"}
                </span>
                <div className="flex gap-2">
                  {review.status === "rejected" && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={moderating !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Одобрить
                    </button>
                  )}
                  {review.status === "approved" && (
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={moderating !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Отклонить
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
