"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Loader2, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { transliterate } from "@/lib/transliterate";
import { blogPostSchema, type BlogPostFormData } from "@/features/admin/schemas/blog";
import type { BlogPostFull } from "@/features/admin/types";
import type { Row } from "@/lib/supabase/table-types";
import {
  createBlogPostAction,
  updateBlogPostAction,
  fetchBlogCategoriesAction,
} from "@/features/admin/actions/blog";
import RichTextEditor from "./RichTextEditor";
import SerpPreview from "./SerpPreview";

interface BlogPostEditorProps {
  post: BlogPostFull | null;
}

export default function BlogPostEditor({ post }: BlogPostEditorProps) {
  const router = useRouter();
  const isNew = !post;
  const [categories, setCategories] = useState<Row<"blog_categories">[]>([]);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BlogPostFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(blogPostSchema) as any,
    defaultValues: post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? null,
          content: post.content,
          cover_image_url: post.cover_image_url ?? null,
          category_id: post.category_id ?? null,
          status: post.status,
          published_at: post.published_at ?? null,
          seo_title: post.seo_title ?? null,
          seo_description: post.seo_description ?? null,
          seo_keywords: post.seo_keywords ?? null,
          reading_time: post.reading_time ?? null,
          tags: post.tags ?? [],
        }
      : {
          title: "",
          slug: "",
          excerpt: null,
          content: "",
          cover_image_url: null,
          category_id: null,
          status: "draft",
          published_at: null,
          seo_title: null,
          seo_description: null,
          seo_keywords: null,
          reading_time: null,
          tags: [],
        },
  });

  const title = watch("title");
  const slug = watch("slug");
  const coverUrl = watch("cover_image_url");
  const seoTitle = watch("seo_title");
  const seoDesc = watch("seo_description");
  const content = watch("content");

  useEffect(() => {
    fetchBlogCategoriesAction().then(setCategories).catch(() => {});
  }, []);

  // Auto-generate slug from title (only for new posts)
  useEffect(() => {
    if (isNew && title) {
      setValue("slug", transliterate(title));
    }
  }, [isNew, title, setValue]);

  const handleUploadCover = useCallback(
    async (file: File) => {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", "blog");
      formData.append("path", "covers");

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error ?? "Ошибка загрузки");
          return;
        }
        const { url } = await res.json();
        setValue("cover_image_url", url);
      } catch {
        toast.error("Ошибка загрузки изображения");
      } finally {
        setUploading(false);
      }
    },
    [setValue],
  );

  async function onSubmit(data: BlogPostFormData) {
    try {
      if (isNew) {
        const result = await createBlogPostAction(data);
        toast.success("Статья создана");
        router.push(`/admin/blog/${result.id}`);
      } else {
        await updateBlogPostAction(post.id, data);
        toast.success("Статья обновлена");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/blog")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
            {isNew ? "Новая статья" : "Редактирование"}
          </h1>
        </div>
        <button
          type="button"
          onClick={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? "Сохранение..." : "Сохранить"}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div className="space-y-5">
          {/* Title */}
          <div>
            <input
              {...register("title")}
              placeholder="Заголовок статьи"
              className="w-full border-none bg-transparent text-2xl font-bold text-brand-dark outline-none placeholder:text-neutral-300 dark:text-white dark:placeholder:text-neutral-600"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Slug
            </label>
            <input
              {...register("slug")}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-transparent px-3 font-mono text-sm dark:border-white/10 dark:text-white"
            />
            {errors.slug && (
              <p className="mt-1 text-xs text-red-500">{errors.slug.message}</p>
            )}
          </div>

          {/* Cover Image */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Обложка
            </label>
            {coverUrl ? (
              <div className="relative aspect-video overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
                <Image
                  src={coverUrl}
                  alt="Обложка"
                  fill
                  className="object-cover"
                  sizes="600px"
                />
                <button
                  type="button"
                  onClick={() => setValue("cover_image_url", null)}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 p-8 transition-colors hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadCover(file);
                  }}
                />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-brand-orange" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-neutral-400" />
                )}
                <p className="mt-2 text-sm text-neutral-500">
                  Нажмите для загрузки обложки
                </p>
              </label>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Краткое описание
            </label>
            <textarea
              {...register("excerpt")}
              rows={2}
              placeholder="Краткое описание для превью..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-3 text-sm outline-none transition-colors focus:border-brand-orange dark:border-white/10 dark:text-white"
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Содержание
            </label>
            <RichTextEditor
              value={content}
              onChange={(val) => setValue("content", val, { shouldValidate: true })}
              placeholder="Напишите статью..."
            />
            {errors.content && (
              <p className="mt-1 text-xs text-red-500">{errors.content.message}</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Status */}
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Статус
            </label>
            <select
              {...register("status")}
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
            >
              <option value="draft">Черновик</option>
              <option value="published">Опубликован</option>
              <option value="archived">Архив</option>
            </select>
          </div>

          {/* Category */}
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Категория
            </label>
            <select
              {...register("category_id", {
                setValueAs: (v) => (v === "" || v === null ? null : Number(v)),
              })}
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
            >
              <option value="">Без категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500">
              SEO
            </label>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  SEO заголовок
                </label>
                <input
                  {...register("seo_title")}
                  maxLength={60}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  SEO описание
                </label>
                <textarea
                  {...register("seo_description")}
                  rows={2}
                  maxLength={160}
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Ключевые слова
                </label>
                <input
                  {...register("seo_keywords")}
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                />
              </div>
              <SerpPreview
                title={seoTitle ?? title}
                description={seoDesc ?? ""}
                slug={slug}
                baseUrl="2x2hm.ru/blog"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
