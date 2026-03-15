"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AnalyzePromptProps {
  repoPath: string;
  onResult: (description: string) => void;
  isZh: boolean;
}

export function AnalyzePrompt({ repoPath, onResult, isZh }: AnalyzePromptProps) {
  const [state, setState] = useState<"idle" | "asking" | "analyzing" | "done">("asking");

  const handleAnalyze = async () => {
    setState("analyzing");
    try {
      const res = await fetch("/api/projects/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoPath }),
      });
      const data = await res.json();
      if (data.description) {
        onResult(data.description);
      }
    } catch {
      // ignore
    }
    setState("done");
  };

  if (state === "done" || state === "idle") return null;

  if (state === "analyzing") {
    return (
      <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 flex items-center gap-2">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        {isZh ? "AI 正在分析项目..." : "AI is analyzing the project..."}
      </div>
    );
  }

  // state === "asking"
  return (
    <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm">
      <p className="text-blue-700">
        {isZh
          ? "检测到项目包含代码文件。是否使用 AI 分析项目并自动生成描述？"
          : "Project contains code files. Use AI to analyze and auto-generate description?"}
      </p>
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={handleAnalyze}>
          {isZh ? "分析项目" : "Analyze"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
          {isZh ? "跳过" : "Skip"}
        </Button>
      </div>
    </div>
  );
}
