"use client";

import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";

export function ProjectDescription({ content }: { content: string }) {
  return (
    <div className="mt-2">
      <MarkdownRenderer content={content} headingIds />
    </div>
  );
}
