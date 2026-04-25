"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Image from "next/image";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

/**
 * Универсальное поле загрузки одного изображения в MinIO/S3.
 *
 * Сценарий:
 *  1. Пустое состояние — dropzone (drag&drop + клик).
 *  2. Загрузка — спиннер.
 *  3. Загружено — превью + «Заменить» / «Удалить».
 *  4. Внешний URL (старый, не из нашего S3) — превью + предупреждение
 *     «внешний URL, замените на локальный файл» + те же действия.
 *
 * Удаление файла из MinIO НЕ выполняется автоматически — это безопаснее
 * (cleanup-cron подметёт osiroting'ленные файлы отдельно). При onChange(null)
 * мы только очищаем поле формы.
 */

// Те же типы, что разрешены сервером (см. app/api/upload/route.ts).
const DEFAULT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/svg+xml";

const ACCEPT_TO_DROPZONE: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/svg+xml": [".svg"],
};

export interface ImageUploadFieldProps {
  /** Текущий публичный URL загруженного файла (или null/"" если ничего нет). */
  value: string | null | undefined;
  /** Колбек при загрузке нового файла или удалении (передаёт null). */
  onChange: (url: string | null) => void;

  /** Подпись поля (отображается над dropzone). */
  label?: string;
  /** Подсказка под dropzone — например, рекомендуемый размер. */
  hint?: string;

  /**
   * Список MIME-типов через запятую (HTML accept-style).
   * По умолчанию принимаем все наши allowed-типы.
   */
  accept?: string;

  /** Максимальный размер файла в МБ. По умолчанию 5. */
  maxSizeMb?: number;

  /**
   * Bucket для будущей гибкости (сервер сейчас игнорирует, всегда
   * пишет в `S3_BUCKET`, но мы передаём в form-data, чтобы можно
   * было добавить multi-bucket позже без правки клиентов).
   */
  bucket?: string;

  /**
   * Папка-префикс в бакете. Сервер принимает значения из whitelist
   * (см. ALLOWED_FOLDERS в app/api/upload/route.ts).
   * Дефолт: "uploads".
   */
  pathPrefix?: string;

  /** Заблокировать поле. */
  disabled?: boolean;

  /**
   * Соотношение сторон для превью. По умолчанию 16/9.
   * Передавайте `square` для 1:1, `portrait` для 4:5, `wide` для 21:9.
   */
  previewAspect?: "video" | "square" | "portrait" | "wide";

  /** Кастомный URL S3, чтобы определить «свой» это файл или внешний. */
  ownPublicUrlPrefix?: string;

  /** Показывать ли warning для внешнего URL. По умолчанию — да. */
  warnOnExternalUrl?: boolean;
}

const ASPECT_CN: Record<NonNullable<ImageUploadFieldProps["previewAspect"]>, string> = {
  video: "aspect-video",
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  wide: "aspect-[21/9]",
};

function isOwnUrl(url: string, ownPrefix?: string): boolean {
  if (!url) return false;
  // Свой — относительный путь (`/2x2-media/...`) ИЛИ начинается с известного
  // S3_PUBLIC_URL. Внешний — всё остальное (особенно http/https с другим origin).
  if (url.startsWith("/")) return true;
  if (ownPrefix && url.startsWith(ownPrefix)) return true;
  // Эвристика: если NEXT_PUBLIC_S3_PUBLIC_URL не задан, не показываем warning
  // для https://erfgv.website/2x2-media/... (наш prod)
  if (/^https?:\/\/[^/]+\/2x2-media\//i.test(url)) return true;
  return false;
}

export default function ImageUploadField({
  value,
  onChange,
  label,
  hint,
  accept = DEFAULT_ACCEPT,
  maxSizeMb = 5,
  bucket = "2x2-media",
  pathPrefix = "uploads",
  disabled = false,
  previewAspect = "video",
  ownPublicUrlPrefix,
  warnOnExternalUrl = true,
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const acceptDropzone = acceptToDropzone(accept);
  const maxSizeBytes = maxSizeMb * 1024 * 1024;
  const cleanValue = value && value.trim().length > 0 ? value.trim() : null;
  const showExternalWarning =
    warnOnExternalUrl && cleanValue !== null && !isOwnUrl(cleanValue, ownPublicUrlPrefix);

  const upload = useCallback(
    async (file: File) => {
      // Клиентская валидация — сервер всё равно проверит.
      if (file.size > maxSizeBytes) {
        toast.error(`Файл больше ${maxSizeMb} МБ`);
        return;
      }
      if (!accept.split(",").map((s) => s.trim()).includes(file.type)) {
        toast.error(`Тип ${file.type || "неизвестен"} не поддерживается`);
        return;
      }

      setUploading(true);
      setProgress(0);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", pathPrefix);
      fd.append("bucket", bucket);

      try {
        const url = await xhrUpload(fd, (p) => setProgress(p), xhrRef);
        onChange(url);
        toast.success("Загружено");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Не удалось загрузить";
        toast.error(msg);
      } finally {
        setUploading(false);
        setProgress(0);
        xhrRef.current = null;
      }
    },
    [accept, bucket, maxSizeBytes, maxSizeMb, onChange, pathPrefix],
  );

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const first = rejections[0]!;
        const reason = first.errors[0]?.code;
        if (reason === "file-too-large") {
          toast.error(`Файл больше ${maxSizeMb} МБ`);
        } else if (reason === "file-invalid-type") {
          toast.error(`Недопустимый тип файла`);
        } else {
          toast.error("Файл отклонён");
        }
        return;
      }
      const file = accepted[0];
      if (file) {
        void upload(file);
      }
    },
    [maxSizeMb, upload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptDropzone,
    maxSize: maxSizeBytes,
    multiple: false,
    disabled: disabled || uploading,
    noClick: cleanValue !== null, // если уже есть превью, кликом не открываем
  });

  function handleRemove() {
    onChange(null);
  }

  function handleReplaceClick(e: DragEvent | React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.click();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-brand-dark dark:text-neutral-200"
        >
          {label}
        </label>
      )}

      {/* Скрытый input для «Заменить». Лежит вне dropzone, чтобы избежать
          двойного триггера при клике по кнопке. */}
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled || uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          // сбрасываем, чтобы можно было выбрать тот же файл повторно
          e.currentTarget.value = "";
        }}
      />

      {cleanValue ? (
        <div className="space-y-2">
          <div
            className={clsx(
              "group relative overflow-hidden rounded-xl border bg-neutral-50 dark:bg-white/5",
              showExternalWarning
                ? "border-amber-300 dark:border-amber-500/40"
                : "border-neutral-200 dark:border-white/10",
              ASPECT_CN[previewAspect],
            )}
          >
            {/* SVG/растровое превью. Используем next/image только для известных
                бакетов; иначе fallback на native <img> чтобы не зависеть от
                next.config.images.remotePatterns. */}
            <PreviewImage url={cleanValue} alt={label ?? "preview"} />

            {uploading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs font-medium tabular-nums">
                  {progress > 0 ? `${progress}%` : "Загрузка…"}
                </span>
              </div>
            )}

            {!uploading && !disabled && (
              <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={handleReplaceClick}
                  className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition-colors hover:bg-white dark:bg-neutral-800/95 dark:text-neutral-100 dark:hover:bg-neutral-800"
                  title="Заменить"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Заменить
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-600"
                  title="Удалить"
                  aria-label="Удалить изображение"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {showExternalWarning && (
            <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Внешний URL (не из нашего хранилища). Рекомендуется заменить
                на локальный файл — это уберёт риск, что картинка пропадёт,
                и ускорит загрузку страницы.
              </span>
            </p>
          )}

          {hint && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {hint}
            </p>
          )}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={clsx(
            "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            ASPECT_CN[previewAspect],
            "min-h-[140px]",
            isDragActive
              ? "border-brand-orange bg-brand-orange/5"
              : "border-neutral-200 bg-neutral-50/40 hover:border-neutral-300 hover:bg-neutral-50 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]",
            (disabled || uploading) && "pointer-events-none opacity-60",
          )}
          aria-disabled={disabled || uploading}
        >
          <input {...getInputProps()} />

          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300 tabular-nums">
                {progress > 0 ? `Загрузка ${progress}%` : "Загрузка…"}
              </p>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-white/10">
                {isDragActive ? (
                  <Upload className="h-4 w-4 text-brand-orange" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-brand-dark dark:text-white">
                  {isDragActive
                    ? "Отпустите файл"
                    : "Перетащите файл или нажмите для выбора"}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {hint ?? formatAcceptHint(accept, maxSizeMb)}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── helpers ──────────────────────────────────────────────────────────────────

function acceptToDropzone(accept: string): Record<string, string[]> {
  const types = accept
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const result: Record<string, string[]> = {};
  for (const type of types) {
    result[type] = ACCEPT_TO_DROPZONE[type] ?? [];
  }
  return result;
}

function formatAcceptHint(accept: string, maxSizeMb: number): string {
  const labels: Record<string, string> = {
    "image/jpeg": "JPG",
    "image/png": "PNG",
    "image/webp": "WebP",
    "image/avif": "AVIF",
    "image/svg+xml": "SVG",
  };
  const formats = accept
    .split(",")
    .map((t) => labels[t.trim()] ?? t.trim())
    .filter(Boolean)
    .join(", ");
  return `${formats} до ${maxSizeMb} МБ`;
}

/**
 * Загрузка через XHR (а не fetch), чтобы получить прогресс upload'а.
 * fetch не даёт ProgressEvent для request body в большинстве браузеров.
 */
function xhrUpload(
  fd: FormData,
  onProgress: (percent: number) => void,
  ref?: React.MutableRefObject<XMLHttpRequest | null>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (ref) ref.current = xhr;

    xhr.open("POST", "/api/upload", true);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      // 2xx — пытаемся распарсить { url }
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText) as { url?: string };
          if (body.url) {
            resolve(body.url);
            return;
          }
          reject(new Error("Сервер не вернул URL"));
        } catch {
          reject(new Error("Некорректный ответ сервера"));
        }
        return;
      }

      // Ошибка — пытаемся достать сообщение из тела.
      let message = `Ошибка загрузки (${xhr.status})`;
      try {
        const body = JSON.parse(xhr.responseText) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // fall through
      }
      reject(new Error(message));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Сеть недоступна"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Загрузка отменена"));
    });

    xhr.send(fd);
  });
}

/**
 * Превью: для известных доменов используем next/image (оптимизация),
 * для неизвестных — native <img> (без next.config.remotePatterns правок).
 */
function PreviewImage({ url, alt }: { url: string; alt: string }) {
  const useNextImage = url.startsWith("/");
  if (useNextImage) {
    return (
      <Image
        src={url}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 400px"
        unoptimized
      />
    );
  }
  return (
    // Внешний URL — не оптимизируем через next/image, чтобы не править
    // remotePatterns под каждый chance'й origin. Это превью в админке,
    // на витрину влияния не имеет.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="absolute inset-0 h-full w-full object-cover"
      loading="lazy"
    />
  );
}
