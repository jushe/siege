"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    targetRepoPath: string;
    updatedAt: string;
  };
  locale: string;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, locale, onDelete }: ProjectCardProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div
      className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/${locale}/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-lg">{project.name}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t("project.deleteConfirm"))) {
              onDelete(project.id);
            }
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
          {t("common.delete")}
        </button>
      </div>
      {project.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {project.description}
        </p>
      )}
      <p className="text-xs text-gray-400 mt-3 font-mono">
        {project.targetRepoPath}
      </p>
    </div>
  );
}
