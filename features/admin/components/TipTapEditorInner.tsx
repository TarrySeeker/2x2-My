"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  ImageIcon,
} from "lucide-react";
import clsx from "clsx";

interface TipTapEditorInnerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        active
          ? "bg-brand-orange/20 text-brand-orange"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

export default function TipTapEditorInner({
  value,
  onChange,
  placeholder,
}: TipTapEditorInnerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value,
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[12rem] px-4 py-3 outline-none",
      },
    },
  });

  if (!editor) return null;

  function handleAddLink() {
    const url = window.prompt("URL ссылки:");
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleAddImage() {
    const url = window.prompt("URL изображения:");
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/10">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 px-2 py-1.5 dark:border-white/10">
        <ToolbarButton
          title="Жирный"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Курсив"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Подчёркнутый"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10" />
        <ToolbarButton
          title="Заголовок H2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Заголовок H3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10" />
        <ToolbarButton
          title="Маркированный список"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Нумерованный список"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10" />
        <ToolbarButton
          title="По левому краю"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="По центру"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="По правому краю"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10" />
        <ToolbarButton title="Ссылка" onClick={handleAddLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Изображение" onClick={handleAddImage}>
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
