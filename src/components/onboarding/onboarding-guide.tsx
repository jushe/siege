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

const STEPS = ["welcome", "github", "ai", "concept", "create"] as const;
type Step = (typeof STEPS)[number];

interface GithubStatus {
  authenticated: boolean;
  ghInstalled: boolean;
  username: string;
}

interface AiStatus {
  anthropic: { configured: boolean; masked: string };
  openai: { configured: boolean; masked: string };
}

export function OnboardingGuide({ locale, onComplete }: OnboardingGuideProps) {
  const t = useTranslations();
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRepoPath, setTargetRepoPath] = useState("");

  // GitHub state
  const [githubStatus, setGithubStatus] = useState<GithubStatus | null>(null);
  const [checkingGithub, setCheckingGithub] = useState(false);

  // AI state
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [savingKeys, setSavingKeys] = useState(false);

  const isZh = locale === "zh";

  const checkGithubAuth = async () => {
    setCheckingGithub(true);
    try {
      const res = await fetch("/api/github/auth");
      setGithubStatus(await res.json());
    } catch {
      setGithubStatus({ authenticated: false, ghInstalled: false, username: "" });
    }
    setCheckingGithub(false);
  };

  const checkAiConfig = async () => {
    setCheckingAi(true);
    try {
      const res = await fetch("/api/ai-config");
      setAiStatus(await res.json());
    } catch {
      setAiStatus(null);
    }
    setCheckingAi(false);
  };

  const saveAiKeys = async () => {
    if (!anthropicKey && !openaiKey) return;
    setSavingKeys(true);
    try {
      await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropicKey: anthropicKey || undefined, openaiKey: openaiKey || undefined }),
      });
      setAnthropicKey("");
      setOpenaiKey("");
      await checkAiConfig();
    } finally {
      setSavingKeys(false);
    }
  };

  const handleCreate = () => {
    if (!name || !targetRepoPath) return;
    onComplete({ name, description, targetRepoPath });
  };

  const anyAiConfigured = aiStatus?.anthropic.configured || aiStatus?.openai.configured;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-2xl w-full">

        {/* Step 1: Welcome */}
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
              <Button
                size="lg"
                onClick={() => {
                  setStep("github");
                  checkGithubAuth();
                }}
              >
                {isZh ? "开始设置" : "Get Started"}
              </Button>
              <Button size="lg" variant="ghost" onClick={() => setStep("create")}>
                {isZh ? "跳过，直接创建项目" : "Skip, create project"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: GitHub */}
        {step === "github" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isZh ? "连接 GitHub" : "Connect GitHub"}
              </h2>
              <p className="text-gray-500 mt-1">
                {isZh
                  ? "连接 GitHub 后可以直接从仓库列表选择项目。不连接也可以从本地目录选择。"
                  : "Connect GitHub to select repos directly. You can also use local directories without GitHub."}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6">
              {checkingGithub ? (
                <div className="text-center py-8 text-gray-400">
                  {isZh ? "检查中..." : "Checking..."}
                </div>
              ) : !githubStatus?.ghInstalled ? (
                <div className="text-center space-y-4 py-4">
                  <div className="text-4xl">⚠️</div>
                  <p className="text-gray-600">
                    {isZh
                      ? "未检测到 GitHub CLI (gh)。安装后可以连接 GitHub 仓库。"
                      : "GitHub CLI (gh) not detected. Install it to connect GitHub repos."}
                  </p>
                  <a href="https://cli.github.com" target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm">
                    https://cli.github.com
                  </a>
                  <div className="pt-2">
                    <Button variant="secondary" onClick={checkGithubAuth}>
                      {isZh ? "重新检测" : "Re-check"}
                    </Button>
                  </div>
                </div>
              ) : githubStatus.authenticated ? (
                <div className="text-center space-y-3 py-4">
                  <div className="text-4xl">✓</div>
                  <p className="text-gray-800 font-medium">
                    {isZh ? `已连接：${githubStatus.username}` : `Connected: ${githubStatus.username}`}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="text-4xl">🔗</div>
                  <p className="text-gray-600">
                    {isZh ? "GitHub CLI 已安装，但未登录。在终端运行：" : "GitHub CLI installed but not logged in. Run:"}
                  </p>
                  <code className="block bg-gray-100 rounded-md px-4 py-2 text-sm font-mono">
                    gh auth login
                  </code>
                  <Button variant="secondary" onClick={checkGithubAuth}>
                    {isZh ? "登录后点击重新检测" : "Re-check after login"}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("welcome")}>{t("common.back")}</Button>
              <Button size="lg" onClick={() => { setStep("ai"); checkAiConfig(); }}>
                {isZh ? "继续" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: AI Configuration */}
        {step === "ai" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isZh ? "配置 AI 服务" : "Configure AI Service"}
              </h2>
              <p className="text-gray-500 mt-1">
                {isZh
                  ? "至少配置一个 AI 提供商的 API Key，用于方案生成、排期、审查和测试。"
                  : "Configure at least one AI provider API key for scheme generation, scheduling, review and testing."}
              </p>
            </div>

            <div className="rounded-lg border bg-white p-6 space-y-5">
              {checkingAi ? (
                <div className="text-center py-8 text-gray-400">
                  {isZh ? "检查中..." : "Checking..."}
                </div>
              ) : (
                <>
                  {/* Anthropic */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Anthropic (Claude)</label>
                      {aiStatus?.anthropic.configured && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ {aiStatus.anthropic.masked}
                        </span>
                      )}
                    </div>
                    {aiStatus?.anthropic.configured ? (
                      <p className="text-xs text-gray-500">
                        {isZh ? "已配置，可在设置页修改。" : "Configured. Change in settings."}
                      </p>
                    ) : (
                      <Input
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                        placeholder="sk-ant-api03-..."
                        type="password"
                      />
                    )}
                  </div>

                  {/* OpenAI */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">OpenAI (GPT)</label>
                      {aiStatus?.openai.configured && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ {aiStatus.openai.masked}
                        </span>
                      )}
                    </div>
                    {aiStatus?.openai.configured ? (
                      <p className="text-xs text-gray-500">
                        {isZh ? "已配置，可在设置页修改。" : "Configured. Change in settings."}
                      </p>
                    ) : (
                      <Input
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-..."
                        type="password"
                      />
                    )}
                  </div>

                  {/* Save button */}
                  {(!aiStatus?.anthropic.configured || !aiStatus?.openai.configured) && (
                    <Button
                      onClick={saveAiKeys}
                      disabled={savingKeys || (!anthropicKey && !openaiKey)}
                      className="w-full"
                    >
                      {savingKeys
                        ? isZh ? "保存中..." : "Saving..."
                        : isZh ? "保存密钥" : "Save Keys"}
                    </Button>
                  )}

                  {!anyAiConfigured && (
                    <p className="text-xs text-amber-600 text-center">
                      {isZh
                        ? "⚠️ 至少配置一个 API Key 才能使用 AI 功能"
                        : "⚠️ At least one API key is required for AI features"}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("github")}>{t("common.back")}</Button>
              <Button size="lg" onClick={() => setStep("concept")}>
                {isZh ? "继续" : "Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Core Workflow */}
        {step === "concept" && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center">
              {isZh ? "核心工作流" : "Core Workflow"}
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: "📋", title: isZh ? "1. 创建计划" : "1. Create Plan", desc: isZh ? "描述你的需求，AI 自动生成标题。在文件夹中组织多个计划。" : "Describe your needs, AI generates the title. Organize plans in folders." },
                { icon: "🔍", title: isZh ? "2. 生成方案" : "2. Generate Scheme", desc: isZh ? "AI 搜索互联网和本地代码，生成技术方案。你可以编辑和审查。" : "AI searches the web and local code to generate technical schemes. Edit and review." },
                { icon: "📊", title: isZh ? "3. 生成排期" : "3. Generate Schedule", desc: isZh ? "确认方案后，AI 拆解为可执行任务，甘特图可视化排期。" : "After confirming schemes, AI breaks them into executable tasks with Gantt chart." },
                { icon: "⚡", title: isZh ? "4. 执行" : "4. Execute", desc: isZh ? "通过 Claude Code 或 Codex 自动执行，实时查看进度。" : "Execute via Claude Code or Codex CLI with real-time progress." },
                { icon: "🔎", title: isZh ? "5. 代码审查" : "5. Code Review", desc: isZh ? "AI 审查实现代码的质量、安全性和可维护性。" : "AI reviews code quality, security, and maintainability." },
                { icon: "✅", title: isZh ? "6. 测试" : "6. Test", desc: isZh ? "AI 生成测试用例并运行，确保实现正确。" : "AI generates and runs tests to verify the implementation." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4 items-start rounded-lg border bg-white p-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("ai")}>{t("common.back")}</Button>
              <Button size="lg" onClick={() => setStep("create")}>
                {isZh ? "创建第一个项目" : "Create Your First Project"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: Create first project */}
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
                placeholder={isZh ? "例如：My Awesome App" : "e.g., My Awesome App"}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("project.description")}
                </label>
                <MarkdownEditor value={description} onChange={setDescription} height={120} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("project.targetRepoPath")}
                </label>
                {targetRepoPath ? (
                  <div className="flex items-center gap-2 rounded-md border px-3 py-2 bg-gray-50">
                    <span className="text-sm font-mono flex-1 truncate">{targetRepoPath}</span>
                    <Button variant="ghost" size="sm" onClick={() => setTargetRepoPath("")}>
                      {isZh ? "重选" : "Change"}
                    </Button>
                  </div>
                ) : (
                  <RepoPicker
                    locale={locale}
                    githubAuthed={githubStatus?.authenticated || false}
                    onSelect={(path) => {
                      setTargetRepoPath(path);
                      if (!name) setName(path.split("/").pop() || "");
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep("concept")}>{t("common.back")}</Button>
              <Button size="lg" onClick={handleCreate} disabled={!name || !targetRepoPath}>
                {t("common.create")}
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
