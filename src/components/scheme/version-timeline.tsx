"use client";

import { useTranslations } from "next-intl";
import { TimeAgo } from "@/components/ui/time-ago";

interface Version {
  id: string;
  version: number;
  title: string;
  createdAt: string;
}

interface VersionTimelineProps {
  versions: Version[];
  selectedVersion: number | null;
  onSelect: (version: number) => void;
}

export function VersionTimeline({
  versions,
  selectedVersion,
  onSelect,
}: VersionTimelineProps) {
  const t = useTranslations("scheme.versions");

  return (
    <div className="space-y-0">
      {/* Current version node */}
      <div className="flex items-start gap-3 pb-3">
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 ring-2 ring-green-200 shrink-0" />
          {versions.length > 0 && (
            <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
          )}
        </div>
        <div className="pb-1 -mt-0.5">
          <span className="text-xs font-medium text-green-700">
            {t("current")}
          </span>
        </div>
      </div>

      {/* Version nodes */}
      {versions.map((v, i) => {
        const isSelected = selectedVersion === v.version;
        const isLast = i === versions.length - 1;

        return (
          <button
            key={v.id}
            onClick={() => onSelect(v.version)}
            className={`w-full text-left flex items-start gap-3 py-2 px-1 rounded transition-colors ${
              isSelected ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
          >
            <div className="flex flex-col items-center">
              {/* Connecting line above */}
              <div
                className={`w-3 h-3 rounded-full shrink-0 border-2 ${
                  isSelected
                    ? "bg-blue-500 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
              />
              {/* Connecting line below */}
              {!isLast && (
                <div className="w-0.5 flex-1 bg-gray-200 mt-1 min-h-[16px]" />
              )}
            </div>
            <div className="-mt-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-mono font-medium ${
                    isSelected ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  v{v.version}
                </span>
                <span className="text-xs text-gray-400">
                  <TimeAgo date={v.createdAt} />
                </span>
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {v.title}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
