"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { RepoPicker } from "@/components/repo-picker/repo-picker";

interface OnboardingGuideProps {
  locale: string;
  onComplete: (project: {
    name: string;
    description: string;
    targetRepoPath: string;
  }) => void;
}

const STEPS = ["welcome", "concept", "create"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingGuide({ locale, onComplete }: OnboardingGuideProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRepoPath, setTargetRepoPath] = useState("");

  const isZh = locale === "zh";

  const handleCreate = () => {
    if (!name || !targetRepoPath) return;
    onComplete({ name, description, targetRepoPath });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-2xl w-full">
        {/* Welcome */}
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold">
              {isZh ? "欢迎使用 Siege" : "Welcome to Siege"}
            </h1>
            <p className="text-lg text-gray-600">
              {isZh
                ? "AI 驱动的智能体开发工具，从方案设计到代码实现的完整工作流。"
                : "AI-powered agent development tool. From design to implementation, all in one place."}
            </p>
            <div className="flex justify-center gap-3 pt-4">
              <Button size="lg" onClick={() => setStep("concept")}>
                {isZh ? "开始了解" : "Get Started"}
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() => setStep("create")}
              >
                {isZh ? "跳过，直接创建项目" : "Skip, create project"}
              </Button>
            </div>
          </div>
        )}

        {/* Concept */}
        {step === "concept" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center">
              {isZh ? "核心工作流" : "Core Workflow"}
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {[
                {
                  icon: "📋",
                  title: isZh ? "1. 创建计划" : "1. Create Plan",
                  desc: isZh
                    ? "描述你的需求，AI 自动生成标题。在文件夹中组织多个计划。"
                    : "Describe your needs, AI generates the title. Organize plans in folders.",
                },
                {
                  icon: "🔍",
                  title: isZh ? "2. 生成方案" : "2. Generate Scheme",
                  desc: isZh
                    ? "AI 搜索互联网和本地代码，生成技术方案。你可以编辑和审查。"
                    : "AI searches the web and local code to generate technical schemes. Edit and review.",
                },
                {
                  icon: "📊",
                  title: isZh ? "3. 生成排期" : "3. Generate Schedule",
                  desc: isZh
                    ? "确认方案后，AI 拆解为可执行任务，甘特图可视化排期。"
                    : "After confirming schemes, AI breaks them into executable tasks with Gantt chart.",
                },
                {
                  icon: "⚡",
                  title: isZh ? "4. 执行" : "4. Execute",
                  desc: isZh
                    ? "通过 Claude Code 或 Codex 自动执行，实时查看进度。"
                    : "Execute via Claude Code or Codex CLI with real-time progress.",
                },
                {
                  icon: "🔎",
                  title: isZh ? "5. 代码审查" : "5. Code Review",
                  desc: isZh
                    ? "AI 审查实现代码的质量、安全性和可维护性。"
                    : "AI reviews code quality, security, and maintainability.",
                },
                {
                  icon: "✅",
                  title: isZh ? "6. 测试" : "6. Test",
                  desc: isZh
                    ? "AI 生成测试用例并运行，确保实现正确。"
                    : "AI generates and runs tests to verify the implementation.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 items-start rounded-lg border bg-white p-4"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-2">
              <Button size="lg" onClick={() => setStep("create")}>
                {isZh ? "创建第一个项目" : "Create Your First Project"}
              </Button>
            </div>
          </div>
        )}

        {/* Create first project */}
        {step === "create" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isZh ? "创建第一个项目" : "Create Your First Project"}
              </h2>
              <p className="text-gray-500 mt-1">
                {isZh
                  ? "项目关联一个代码仓库，所有计划和执行都基于此。"
                  : "A project is linked to a code repository. All plans and executions are based on it."}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 space-y-4">
              <Input
                label={t("project.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  isZh ? "例如：My Awesome App" : "e.g., My Awesome App"
                }
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("project.description")}
                </label>
                <MarkdownEditor
                  value={description}
                  onChange={setDescription}
                  height={120}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("project.targetRepoPath")}
                </label>
                {targetRepoPath ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-gray-50">
                    <span className="text-sm font-mono flex-1 truncate">
                      {targetRepoPath}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTargetRepoPath("")}
                    >
                      {isZh ? "重选" : "Change"}
                    </Button>
                  </div>
                ) : (
                  <RepoPicker
                    locale={locale}
                    onSelect={(path) => {
                      setTargetRepoPath(path);
                      if (!name) {
                        setName(path.split("/").pop() || "");
                      }
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("concept")}>
                {t("common.back")}
              </Button>
              <Button
                size="lg"
                onClick={handleCreate}
                disabled={!name || !targetRepoPath}
              >
                {t("common.create")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
