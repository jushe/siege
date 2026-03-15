"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PlanCard } from "./plan-card";
import { CreatePlanDialog } from "./create-plan-dialog";

interface Plan {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

interface PlanListProps {
  projectId: string;
  locale: string;
}

export function PlanList({ projectId, locale }: PlanListProps) {
  const t = useTranslations();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPlans = async () => {
    const res = await fetch(`/api/plans?projectId=${projectId}`);
    const data = await res.json();
    setPlans(data);
  };

  useEffect(() => {
    fetchPlans();
  }, [projectId]);

  const handleCreate = async (data: {
    name: string;
    description: string;
  }) => {
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, projectId }),
    });
    fetchPlans();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/plans/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t("plan.title")}</h2>
        <Button onClick={() => setDialogOpen(true)}>
          {t("plan.create")}
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="text-gray-500 text-center py-12">
          {t("common.noData")}
        </p>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              locale={locale}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <CreatePlanDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
