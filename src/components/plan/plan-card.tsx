"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

interface PlanCardProps {
  plan: {
    id: string;
    projectId: string;
    name: string;
    description: string | null;
    status: string;
    updatedAt: string;
  };
  locale: string;
  onDelete: (id: string) => void;
}

export function PlanCard({ plan, locale, onDelete }: PlanCardProps) {
  const t = useTranslations();
  const router = useRouter();

  return (
    <div
      className="rounded-lg border bg-white p-5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() =>
        router.push(`/${locale}/projects/${plan.projectId}/plans/${plan.id}`)
      }
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{plan.name}</h3>
          <StatusBadge
            status={plan.status}
            label={t(`plan.status.${plan.status}`)}
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(t("plan.deleteConfirm"))) {
              onDelete(plan.id);
            }
          }}
          className="text-gray-400 hover:text-red-500 text-sm"
        >
          {t("common.delete")}
        </button>
      </div>
      {plan.description && (
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
          {plan.description}
        </p>
      )}
    </div>
  );
}
