"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlanTabs } from "@/components/plan/plan-tabs";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { CheckCircleIcon } from "@/components/ui/icons";

interface Plan {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  tag: string | null;
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string; planId: string }>;
}) {
  const { locale, projectId, planId } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const fetchPlan = async () => {
    const res = await fetch(`/api/plans/${planId}`);
    const data = await res.json();
    setPlan(data);
  };

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const startEdit = () => {
    if (!plan) return;
    setEditName(plan.name);
    setEditDesc(plan.description || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    await fetch(`/api/plans/${planId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    setEditing(false);
    await fetchPlan();
  };

  const isZh = t("common.back") === "返回";

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

        {editing ? (
          <div className="mt-2 space-y-3">
            <Input
              label={t("plan.name")}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("plan.description")}
              </label>
              <textarea
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={saveEdit}>{t("common.save")}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mt-2">
              <h1 className="text-3xl font-bold">{plan.name}</h1>
              <StatusBadge
                status={plan.status}
                label={t(`plan.status.${plan.status}`)}
              />
              <button
                onClick={startEdit}
                className="text-xs px-2 py-1 rounded hover:opacity-80"
                style={{ color: "var(--muted)" }}
              >
                {t("common.edit")}
              </button>
              <div className="flex-1" />
              {plan.status !== "completed" && plan.status !== "draft" && (
                <Button size="sm" variant="secondary" onClick={() => setCompleteDialogOpen(true)}>
                  {isZh ? "完成" : "Complete"}
                </Button>
              )}
              {plan.status === "completed" && (
                <span className="text-xs px-2 py-1 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#86efac" }}>
                  {isZh ? "已归档" : "Archived"}
                </span>
              )}
            </div>
            {plan.description && (
              <div className="mt-2">
                <MarkdownRenderer content={plan.description} />
              </div>
            )}
          </>
        )}
      </div>

      <PlanTabs
        planId={plan.id}
        planStatus={plan.status}
        projectId={projectId}
        onPlanStatusChange={fetchPlan}
      />

      {/* Complete confirmation dialog */}
      <Dialog
        open={completeDialogOpen}
        onClose={() => { if (!completing) setCompleteDialogOpen(false); }}
        title={completed
          ? (isZh ? "计划已完成" : "Plan Completed")
          : (isZh ? "完成计划" : "Complete Plan")}
      >
        {completed ? (
          <div className="text-center space-y-4 py-4">
            <CheckCircleIcon size={48} className="mx-auto text-green-500" />
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {isZh
                ? "计划已标记为完成并进入归档状态。你可以在项目页面查看归档计划。"
                : "Plan has been marked as completed and archived. You can view archived plans on the project page."}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" onClick={() => { setCompleteDialogOpen(false); setCompleted(false); }}>
                {isZh ? "留在此页" : "Stay Here"}
              </Button>
              <Button onClick={() => router.push(`/${locale}/projects/${projectId}`)}>
                {isZh ? "返回项目" : "Back to Project"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "var(--foreground)" }}>
              {isZh
                ? "确定将此计划标记为完成？完成后计划将进入归档状态。"
                : "Mark this plan as completed? It will be archived after completion."}
            </p>
            <ul className="text-xs space-y-1" style={{ color: "var(--muted)" }}>
              <li>{isZh ? "• 所有排期任务将保持当前状态" : "• All scheduled tasks will keep their current status"}</li>
              <li>{isZh ? "• 审查和测试结果将被保留" : "• Review and test results will be preserved"}</li>
              <li>{isZh ? "• 归档后仍可查看，但不能修改" : "• You can still view but not edit after archiving"}</li>
            </ul>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCompleteDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={async () => {
                  setCompleting(true);
                  await fetch(`/api/plans/${planId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "completed" }),
                  });
                  await fetchPlan();
                  setCompleting(false);
                  setCompleted(true);
                }}
                disabled={completing}
              >
                {completing ? (isZh ? "处理中..." : "Processing...") : (isZh ? "确认完成" : "Confirm")}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
