"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface SchemeEditorProps {
  initialTitle?: string;
  initialContent?: string;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
}

export function SchemeEditor({
  initialTitle = "",
  initialContent = "",
  onSave,
  onCancel,
}: SchemeEditorProps) {
  const t = useTranslations();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);

  return (
    <div className="rounded-lg border bg-white p-5 space-y-4">
      <Input
        label={t("scheme.schemeTitle")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t("scheme.content")}
        </label>
        <MarkdownEditor value={content} onChange={setContent} height={300} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button onClick={() => onSave(title, content)} disabled={!title}>
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}
