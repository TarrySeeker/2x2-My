"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const TipTapEditor = dynamic(() => import("./TipTapEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center rounded-xl border border-neutral-200 dark:border-white/10">
      <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
    </div>
  ),
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor(props: RichTextEditorProps) {
  return <TipTapEditor {...props} />;
}
