"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Upload, X, Star, GripVertical, Loader2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

export interface ImageItem {
  id?: number;
  url: string;
  alt_text?: string | null;
  sort_order: number;
  is_primary: boolean;
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
}

function SortableImage({
  image,
  onRemove,
  onSetPrimary,
}: {
  image: ImageItem;
  onRemove: () => void;
  onSetPrimary: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative aspect-square overflow-hidden rounded-xl border",
        "bg-neutral-50 dark:bg-white/5",
        isDragging
          ? "z-10 border-brand-orange shadow-lg"
          : "border-neutral-200 dark:border-white/10",
      )}
    >
      <Image
        src={image.url}
        alt={image.alt_text ?? ""}
        fill
        className="object-cover"
        sizes="120px"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30">
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
            aria-label="Удалить"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
        <button
          type="button"
          onClick={onSetPrimary}
          className={clsx(
            "absolute bottom-1 left-1 flex h-6 w-6 items-center justify-center rounded-full transition-colors",
            image.is_primary
              ? "bg-amber-400 text-white"
              : "bg-white/80 text-neutral-400 opacity-0 hover:text-amber-500 group-hover:opacity-100",
          )}
          aria-label={
            image.is_primary ? "Главное фото" : "Сделать главным"
          }
        >
          <Star className="h-3 w-3" />
        </button>
        <div
          className="absolute left-1 top-1 flex h-6 w-6 cursor-grab items-center justify-center rounded-full bg-white/80 text-neutral-400 opacity-0 group-hover:opacity-100"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

export default function ImageUploader({
  images,
  onChange,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);
      const newImages: ImageItem[] = [];

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", "images");
        formData.append("path", "products");

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const err = await res.json();
            toast.error(err.error ?? "Ошибка загрузки");
            continue;
          }
          const { url } = await res.json();
          newImages.push({
            url,
            alt_text: null,
            sort_order: images.length + newImages.length,
            is_primary: images.length === 0 && newImages.length === 0,
          });
        } catch {
          toast.error(`Не удалось загрузить ${file.name}`);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
      }
      setUploading(false);
    },
    [images, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/svg+xml": [".svg"],
    },
    maxSize: 5 * 1024 * 1024,
    disabled: uploading,
  });

  function handleRemove(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    // If removed the primary, make the first one primary
    if (images[idx].is_primary && next.length > 0) {
      next[0].is_primary = true;
    }
    onChange(next.map((img, i) => ({ ...img, sort_order: i })));
  }

  function handleSetPrimary(idx: number) {
    onChange(
      images.map((img, i) => ({
        ...img,
        is_primary: i === idx,
      })),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = images.findIndex((img) => img.url === active.id);
    const newIdx = images.findIndex((img) => img.url === over.id);

    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(images, oldIdx, newIdx);
      onChange(reordered.map((img, i) => ({ ...img, sort_order: i })));
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={clsx(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors",
          isDragActive
            ? "border-brand-orange bg-brand-orange/5"
            : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
          uploading && "pointer-events-none opacity-50",
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
        ) : (
          <Upload className="h-8 w-8 text-neutral-400" />
        )}
        <p className="mt-2 text-sm text-neutral-500">
          {isDragActive
            ? "Отпустите файлы..."
            : "Перетащите или нажмите для выбора"}
        </p>
        <p className="text-xs text-neutral-400">
          JPG, PNG, WebP, SVG до 5 МБ
        </p>
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.url)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img, i) => (
                <SortableImage
                  key={img.url}
                  image={img}
                  onRemove={() => handleRemove(i)}
                  onSetPrimary={() => handleSetPrimary(i)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
