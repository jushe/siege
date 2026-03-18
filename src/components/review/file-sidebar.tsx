"use client";

import { useTranslations } from "next-intl";

interface FileEntry {
  filePath: string;
  additions: number;
  deletions: number;
  findingCount: number;
}

interface FileSidebarProps {
  files: FileEntry[];
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

export function FileSidebar({ files, selectedFile, onSelectFile }: FileSidebarProps) {
  const t = useTranslations();

  if (files.length === 0) {
    return (
      <div className="w-64 border-r p-4">
        <p className="text-sm text-gray-500">{t("review.noChanges")}</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-r overflow-y-auto">
      <div className="p-3 border-b bg-gray-50">
        <h5 className="text-xs font-semibold text-gray-600 uppercase">
          {t("review.changedFiles")}
        </h5>
      </div>
      <div className="divide-y">
        {files.map((file) => {
          const basename = file.filePath.split("/").pop() || file.filePath;
          const isActive = selectedFile === file.filePath;
          return (
            <button
              key={file.filePath}
              onClick={() => onSelectFile(file.filePath)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                isActive ? "bg-blue-50 border-l-2 border-blue-500" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs truncate flex-1" title={file.filePath}>
                  {basename}
                </span>
                {file.findingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                    {file.findingCount}
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-0.5">
                {file.additions > 0 && (
                  <span className="text-xs text-green-600">+{file.additions}</span>
                )}
                {file.deletions > 0 && (
                  <span className="text-xs text-red-600">-{file.deletions}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 truncate mt-0.5">
                {file.filePath}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
