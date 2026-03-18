"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TimeAgo } from "@/components/ui/time-ago";
import { computeDiff } from "@/lib/diff";

interface Version {
  id: string;
  schemeId: string;
  version: number;
  title: string;
  content: string | null;
  createdAt: string;
}

interface SchemeVersionsProps {
  schemeId: string;
  currentContent: string;
  open: boolean;
  onClose: () => void;
  onRestore: (content: string) => void;
}

export function SchemeVersions({
  schemeId,
  currentContent,
  open,
  onClose,
  onRestore,
}: SchemeVersionsProps) {
  const t = useTranslations();
  const [versions, setVersions] = useState<Version[]>([]);
  const [selectedA, setSelectedA] = useState<number | null>(null);
  const [selectedB, setSelectedB] = useState<number | null>(null);
  const [diffResult, setDiffResult] = useState<
    Array<{ type: "same" | "add" | "remove"; text: string }>
  >([]);

  useEffect(() => {
    if (open) {
      fetch(`/api/schemes/${schemeId}/versions`)
        .then((r) => r.json())
        .then((data) => {
          setVersions(data);
          if (data.length >= 1) {
            setSelectedA(data[data.length - 1].version);
            setSelectedB(null); // null = current
          }
        })
        .catch(() => {});
    }
  }, [open, schemeId]);

  useEffect(() => {
    if (selectedA === null) return;

    const contentA =
      versions.find((v) => v.version === selectedA)?.content || "";
    const contentB =
      selectedB === null
        ? currentContent
        : versions.find((v) => v.version === selectedB)?.content || "";

    setDiffResult(computeDiff(contentA, contentB));
  }, [selectedA, selectedB, versions, currentContent]);

  const isZh = t("common.back") === "返回";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isZh ? "版本历史" : "Version History"}
    >
      <div className="space-y-4">
        {versions.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            {isZh ? "暂无历史版本" : "No versions yet"}
          </p>
        ) : (
          <>
            {/* Version selector */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {isZh ? "对比基准" : "Base"}
                </label>
                <select
                  value={selectedA ?? ""}
                  onChange={(e) => setSelectedA(Number(e.target.value))}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.version}>
                      v{v.version} — {v.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {isZh ? "对比目标" : "Compare"}
                </label>
                <select
                  value={selectedB ?? "current"}
                  onChange={(e) =>
                    setSelectedB(
                      e.target.value === "current"
                        ? null
                        : Number(e.target.value)
                    )
                  }
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="current">
                    {isZh ? "当前版本" : "Current"}
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.version}>
                      v{v.version} — {v.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff view */}
            <div className="max-h-80 overflow-y-auto border rounded bg-gray-50 font-mono text-xs">
              {diffResult.map((line, i) => (
                <div
                  key={i}
                  className={`px-3 py-0.5 whitespace-pre-wrap ${
                    line.type === "add"
                      ? "bg-green-100 text-green-800"
                      : line.type === "remove"
                        ? "bg-red-100 text-red-800 line-through"
                        : ""
                  }`}
                >
                  <span className="inline-block w-4 text-gray-400 mr-2 select-none">
                    {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                  </span>
                  {line.text || " "}
                </div>
              ))}
            </div>

            {/* Restore button */}
            {selectedA !== null && (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onClose}>
                  {t("common.cancel")}
                </Button>
                <Button
                  onClick={() => {
                    const version = versions.find(
                      (v) => v.version === selectedA
                    );
                    if (version?.content) {
                      onRestore(version.content);
                      onClose();
                    }
                  }}
                >
                  {isZh
                    ? `恢复到 v${selectedA}`
                    : `Restore to v${selectedA}`}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
