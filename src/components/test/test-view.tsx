"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer";
import { CheckIcon, XIcon, CircleIcon, PlayIcon, SparklesIcon } from "@/components/ui/icons";
import { ProviderModelSelect, useDefaultProvider } from "@/components/ui/provider-model-select";
import { useGlobalLoading } from "@/components/ui/global-loading";

interface TestResult {
  id: string;
  testCaseId: string;
  runAt: string;
  status: string;
  output: string | null;
  errorMessage: string | null;
  durationMs: number | null;
}

interface TestCase {
  id: string;
  name: string;
  description: string | null;
  type: string;
  generatedCode: string | null;
  filePath: string | null;
  status: string;
  scheduleItemId: string | null;
  results: TestResult[];
}

interface TestSuite {
  id: string;
  planId: string;
  status: string;
  cases: TestCase[];
}

interface ScheduleTask {
  id: string;
  title: string;
  order: number;
  status: string;
  fileCount: number;
}

interface TestViewProps {
  planId: string;
  planStatus: string;
  onPlanStatusChange: () => void;
}

export function TestView({ planId, planStatus, onPlanStatusChange }: TestViewProps) {
  const t = useTranslations();
  const isZh = t("common.back") === "返回";
  const [suite, setSuite] = useState<TestSuite | null>(null);
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [runningCase, setRunningCase] = useState<string | null>(null);
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const defaultProvider = useDefaultProvider();
  const { startLoading, updateContent, stopLoading } = useGlobalLoading();

  useEffect(() => {
    if (defaultProvider && !provider) setProvider(defaultProvider);
  }, [defaultProvider]);

  const fetchSuite = async () => {
    const res = await fetch(`/api/test-suites?planId=${planId}`);
    const data = await res.json();
    setSuite(data);
  };

  const fetchTasks = async () => {
    const res = await fetch(`/api/snapshots/tasks?planId=${planId}`);
    if (res.ok) {
      const data = await res.json();
      setTasks(data);
    }
  };

  useEffect(() => {
    fetchSuite();
    fetchTasks();
  }, [planId]);

  const toggleTask = (id: string) => {
    setSelectedTasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const handleGenerate = async () => {
    if (selectedTasks.size === 0) return;
    setGenerating(true);
    const taskNames = tasks.filter(t => selectedTasks.has(t.id)).map(t => `#${t.order} ${t.title}`);
    startLoading(isZh ? `生成测试用例 (${selectedTasks.size} 个任务)` : `Generating tests (${selectedTasks.size} tasks)`);
    updateContent(taskNames.join("\n"));
    try {
      await fetch("/api/test-suites/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          provider: provider || undefined,
          model: model || undefined,
          scheduleItemIds: Array.from(selectedTasks),
        }),
      });
      await fetchSuite();
      onPlanStatusChange();
      stopLoading(isZh ? "测试用例生成完成" : "Tests generated");
    } catch {
      stopLoading(isZh ? "生成失败" : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRunCase = async (caseId: string) => {
    setRunningCase(caseId);
    try {
      await fetch(`/api/test-cases/${caseId}/run`, { method: "POST" });
      await fetchSuite();
    } finally {
      setRunningCase(null);
    }
  };

  const handleRunAll = async () => {
    if (!suite) return;
    const toRun = suite.cases.filter(tc => tc.status !== "passed");
    if (toRun.length === 0) return;
    startLoading(isZh ? `运行测试 (0/${toRun.length})` : `Running tests (0/${toRun.length})`);
    let done = 0;
    let passed = 0;
    for (const tc of toRun) {
      setRunningCase(tc.id);
      updateContent(isZh
        ? `[${done + 1}/${toRun.length}] ${tc.name}...`
        : `[${done + 1}/${toRun.length}] ${tc.name}...`);
      await fetch(`/api/test-cases/${tc.id}/run`, { method: "POST" });
      done++;
      // Quick check result
      const res = await fetch(`/api/test-suites?planId=${planId}`);
      const freshSuite = await res.json() as TestSuite | null;
      const freshCase = freshSuite?.cases.find(c => c.id === tc.id);
      if (freshCase?.status === "passed") passed++;
    }
    setRunningCase(null);
    await fetchSuite();
    onPlanStatusChange();
    stopLoading(isZh
      ? `测试完成: ${passed}/${done} 通过`
      : `Done: ${passed}/${done} passed`);
  };

  const passedCount = suite?.cases.filter(c => c.status === "passed").length || 0;
  const totalCount = suite?.cases.length || 0;

  // Group cases by task
  const casesByTask = new Map<string, { title: string; order: number; cases: TestCase[] }>();
  if (suite) {
    for (const tc of suite.cases) {
      const taskId = tc.scheduleItemId || "_unlinked";
      if (!casesByTask.has(taskId)) {
        const task = tasks.find(t => t.id === taskId);
        casesByTask.set(taskId, {
          title: task?.title || (isZh ? "未关联任务" : "Unlinked"),
          order: task?.order ?? 999,
          cases: [],
        });
      }
      casesByTask.get(taskId)!.cases.push(tc);
    }
  }
  const sortedGroups = [...casesByTask.values()].sort((a, b) => a.order - b.order);
  const hasGroups = sortedGroups.length > 1 || (sortedGroups.length === 1 && sortedGroups[0].order !== 999);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{t("plan.tabs.tests")}</h3>
          {suite && totalCount > 0 && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {passedCount}/{totalCount} {isZh ? "通过" : "passed"}
            </span>
          )}
        </div>
        {suite && suite.cases.length > 0 && (
          <Button size="sm" onClick={handleRunAll} disabled={runningCase !== null}>
            <PlayIcon size={14} className="inline-block align-[-2px]" /> {runningCase ? t("common.loading") : (isZh ? "全部运行" : "Run All")}
          </Button>
        )}
      </div>

      {/* Task selector for generation */}
      {tasks.length > 0 && (
        <div className="rounded-lg border p-4" style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {isZh ? "选择要测试的已完成任务" : "Select completed tasks to test"}
            </h4>
            <button onClick={selectAll} className="text-xs" style={{ color: "var(--muted)" }}>
              {selectedTasks.size === tasks.length ? (isZh ? "取消全选" : "Deselect All") : (isZh ? "全选" : "Select All")}
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {tasks.map((task) => {
              const existingCases = suite?.cases.filter(c => c.scheduleItemId === task.id) || [];
              const taskPassed = existingCases.length > 0 && existingCases.every(c => c.status === "passed");
              return (
                <label
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer hover:opacity-80"
                  style={{ background: selectedTasks.has(task.id) ? "rgba(59,130,246,0.1)" : undefined }}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.has(task.id)}
                    onChange={() => toggleTask(task.id)}
                    className="rounded"
                  />
                  <span className="text-sm flex-1" style={{ color: "var(--foreground)" }}>
                    #{task.order} {task.title}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                    {task.fileCount} {isZh ? "文件" : "files"}
                  </span>
                  {existingCases.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{
                      background: taskPassed ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
                      color: taskPassed ? "#86efac" : "#93c5fd",
                    }}>
                      {existingCases.filter(c => c.status === "passed").length}/{existingCases.length}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <ProviderModelSelect
              provider={provider}
              model={model}
              onProviderChange={setProvider}
              onModelChange={setModel}
              disabled={generating}
              compact
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || selectedTasks.size === 0}
              size="sm"
            >
              <SparklesIcon size={14} className="inline-block align-[-2px]" /> {generating
                ? (isZh ? "生成中..." : "Generating...")
                : (isZh ? `生成测试 (${selectedTasks.size})` : `Generate Tests (${selectedTasks.size})`)}
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--muted)" }}>
          {isZh ? "暂无已完成的任务。请先执行排期任务。" : "No completed tasks yet. Execute schedule tasks first."}
        </p>
      )}

      {/* Test cases grouped by task */}
      {suite && suite.cases.length > 0 && (
        <div className="space-y-3">
          {sortedGroups.map((group) => {
            const groupPassed = group.cases.filter(c => c.status === "passed").length;
            return (
              <div key={group.order} className="rounded-lg border" style={{ borderColor: "var(--card-border)" }}>
                {hasGroups && (
                  <div className="px-4 py-2 flex items-center justify-between" style={{ background: "var(--background)", borderBottom: "1px solid var(--card-border)" }}>
                    <span className="text-xs font-medium" style={{ color: "var(--muted)" }}>
                      #{group.order} {group.title}
                    </span>
                    <span className="text-[10px]" style={{ color: groupPassed === group.cases.length ? "#86efac" : "var(--muted)" }}>
                      {groupPassed}/{group.cases.length}
                    </span>
                  </div>
                )}
                {group.cases.map((tc) => (
                  <div key={tc.id} style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <div
                      className="px-4 py-3 flex items-center justify-between cursor-pointer hover:opacity-80"
                      style={{ background: "var(--card)" }}
                      onClick={() => setExpandedCase(expandedCase === tc.id ? null : tc.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {tc.status === "passed"
                          ? <CheckIcon size={16} className="text-green-500 shrink-0" />
                          : tc.status === "failed"
                            ? <XIcon size={16} className="text-red-500 shrink-0" />
                            : <CircleIcon size={16} className="text-gray-500 shrink-0" />}
                        <div className="min-w-0">
                          <span className="text-sm truncate block" style={{ color: "var(--foreground)" }}>
                            {tc.description || tc.name}
                          </span>
                          {tc.description && (
                            <span className="text-[10px] font-mono truncate block" style={{ color: "var(--muted)" }}>
                              {tc.name}
                            </span>
                          )}
                        </div>
                        <StatusBadge status={tc.type} label={tc.type} />
                      </div>
                      <div className="flex items-center gap-2">
                        {tc.results.length > 0 && (
                          <span className="text-xs" style={{ color: "var(--muted)" }}>
                            {tc.results[tc.results.length - 1].durationMs}ms
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleRunCase(tc.id); }}
                          disabled={runningCase !== null}
                        >
                          {runningCase === tc.id ? "..." : (isZh ? "运行" : "Run")}
                        </Button>
                      </div>
                    </div>

                    {expandedCase === tc.id && (
                      <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--card-border)", background: "var(--card)" }}>
                        {tc.description && (
                          <div className="pt-3">
                            <MarkdownRenderer content={tc.description} />
                          </div>
                        )}
                        {tc.generatedCode && (
                          <div className="pt-2">
                            <h5 className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
                              {isZh ? "生成的测试代码" : "Generated Code"}
                            </h5>
                            <MarkdownRenderer content={`\`\`\`\n${tc.generatedCode}\n\`\`\``} />
                          </div>
                        )}
                        {tc.results.length > 0 && (
                          <div className="pt-2">
                            <h5 className="text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
                              {isZh ? `运行记录 (${tc.results.length})` : `Results (${tc.results.length})`}
                            </h5>
                            {tc.results.slice().reverse().map((r) => (
                              <div key={r.id} className="text-xs p-3 rounded mb-2" style={{ background: "var(--background)", color: "var(--foreground)" }}>
                                <div className="flex items-center gap-2 mb-1">
                                  <StatusBadge status={r.status} label={r.status} />
                                  <span style={{ color: "var(--muted)" }}>{r.durationMs}ms</span>
                                  <span style={{ color: "var(--muted)" }} suppressHydrationWarning>
                                    {new Date(r.runAt).toLocaleString()}
                                  </span>
                                </div>
                                {r.output && <pre className="whitespace-pre-wrap mt-1">{r.output}</pre>}
                                {r.errorMessage && <pre className="whitespace-pre-wrap text-red-400 mt-1">{r.errorMessage}</pre>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
