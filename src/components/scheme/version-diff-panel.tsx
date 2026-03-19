"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { computeDiff } from "@/lib/diff";

interface VersionDiffPanelProps {
  oldContent: string;
  newContent: string;
  oldLabel: string;
  newLabel: string;
}

export function VersionDiffPanel({
  oldContent,
  newContent,
  oldLabel,
  newLabel,
}: VersionDiffPanelProps) {
  const t = useTranslations("scheme.versions");

  const diffLines = useMemo(
    () => computeDiff(oldContent, newContent),
    [oldContent, newContent]
  );

  const stats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    for (const line of diffLines) {
      if (line.type === "add") additions++;
      if (line.type === "remove") deletions++;
    }
    return { additions, deletions };
  }, [diffLines]);

  const isIdentical = stats.additions === 0 && stats.deletions === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b mb-3">
        <div className="text-xs text-gray-500">
          <span className="font-mono font-medium text-gray-700">
            {oldLabel}
          </span>
          {" → "}
          <span className="font-mono font-medium text-gray-700">
            {newLabel}
          </span>
        </div>
        {!isIdentical && (
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-green-600">
              {t("additions", { count: stats.additions })}
            </span>
            <span className="text-red-600">
              {t("deletions", { count: stats.deletions })}
            </span>
          </div>
        )}
      </div>

      {/* Diff content */}
      {isIdentical ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          {t("noDiff")}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto border rounded bg-gray-50 font-mono text-xs leading-relaxed">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={`flex ${
                line.type === "add"
                  ? "bg-green-50"
                  : line.type === "remove"
                    ? "bg-red-50"
                    : ""
              }`}
            >
              {/* Old line number */}
              <span className="w-10 shrink-0 text-right pr-2 py-px text-gray-400 select-none border-r border-gray-200">
                {line.oldLineNumber ?? ""}
              </span>
              {/* New line number */}
              <span className="w-10 shrink-0 text-right pr-2 py-px text-gray-400 select-none border-r border-gray-200">
                {line.newLineNumber ?? ""}
              </span>
              {/* Type indicator */}
              <span
                className={`w-5 shrink-0 text-center py-px select-none ${
                  line.type === "add"
                    ? "text-green-600"
                    : line.type === "remove"
                      ? "text-red-600"
                      : "text-gray-300"
                }`}
              >
                {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
              </span>
              {/* Content */}
              <span
                className={`flex-1 py-px pr-3 whitespace-pre-wrap break-all ${
                  line.type === "add"
                    ? "text-green-800"
                    : line.type === "remove"
                      ? "text-red-800 line-through"
                      : ""
                }`}
              >
                {line.text || " "}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
