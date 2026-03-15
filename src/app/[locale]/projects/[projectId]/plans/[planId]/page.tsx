"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlanTabs } from "@/components/plan/plan-tabs";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";

interface Plan {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string; planId: string }>;
}) {
  const { locale, projectId, planId } = use(params);
  const t = useTranslations();
  const [plan, setPlan] = useState<Plan | null>(null);

  const fetchPlan = async () => {
    const res = await fetch(`/api/plans/${planId}`);
    const data = await res.json();
    setPlan(data);
  };

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  if (!plan) {
    return <p>{t("common.loading")}</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <a
          href={`/${locale}/projects/${projectId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; {t("common.back")}
        </a>
        <div className="flex items-center gap-3 mt-2">
          <h1 className="text-3xl font-bold">{plan.name}</h1>
          <StatusBadge
            status={plan.status}
            label={t(`plan.status.${plan.status}`)}
          />
        </div>
        {plan.description && (
          <div className="mt-2">
            <MarkdownRenderer content={plan.description} />
          </div>
        )}
      </div>

      <PlanTabs
        planId={plan.id}
        planStatus={plan.status}
        onPlanStatusChange={fetchPlan}
      />
    </div>
  );
}
