"use client";

import { useState, useEffect, use } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProviderStatus {
  configured: boolean;
  masked: string;
  baseURL: string;
  mode: string;
}

interface AiConfig {
  anthropic: ProviderStatus;
  openai: ProviderStatus;
  glm: ProviderStatus;
  claude?: { installed: boolean; loggedIn: boolean; email?: string };
}

interface SkillSummary {
  name: string;
  source: string;
  description: string;
}

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", keyPlaceholder: "sk-ant-api03-..." },
  { id: "openai", label: "OpenAI (GPT)", keyPlaceholder: "sk-..." },
  { id: "glm", label: "GLM (智谱)", keyPlaceholder: "glm-api-key..." },
] as const;

export default function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const t = useTranslations();
  const isZh = locale === "zh";

  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [saved, setSaved] = useState(false);

  // Per-provider edit state
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);

  useEffect(() => {
    fetch("/api/ai-config").then((r) => r.json()).then(setAiConfig);
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
    fetch("/api/skills").then((r) => r.json()).then(setSkills);
  }, []);

  const saveProvider = async (providerId: string) => {
    setSavingProvider(true);
    await fetch("/api/ai-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: providerId,
        apiKey: editKey || undefined,
        baseURL: editUrl || undefined,
      }),
    });
    const res = await fetch("/api/ai-config");
    setAiConfig(await res.json());
    setEditingProvider(null);
    setEditKey("");
    setEditUrl("");
    setSavingProvider(false);
  };

  const saveSettings = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const skillsBySource = skills.reduce<Record<string, SkillSummary[]>>(
    (acc, s) => { if (!acc[s.source]) acc[s.source] = []; acc[s.source].push(s); return acc; }, {}
  );

  return (
    <div>
      <a href={`/${locale}`} className="text-sm text-blue-600 hover:underline">
        &larr; {t("common.back")}
      </a>
      <h1 className="text-3xl font-bold mt-2 mb-8">{t("nav.settings")}</h1>

      {/* AI Providers */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isZh ? "AI 服务配置" : "AI Provider Configuration"}
        </h2>

        {/* Claude Login Status */}
        {aiConfig?.claude?.installed && (
          <div className="rounded-lg border bg-white p-4 mb-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Claude Code Login</span>
              {aiConfig.claude.loggedIn ? (
                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ {aiConfig.claude.email || (isZh ? "已登录" : "Logged in")}
                </span>
              ) : (
                <span className="text-xs text-gray-500">
                  {isZh ? "未登录" : "Not logged in"}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {PROVIDERS.map((prov) => {
            const status = aiConfig?.[prov.id as keyof AiConfig] as ProviderStatus | undefined;
            const isEditing = editingProvider === prov.id;

            return (
              <div key={prov.id} className="rounded-lg border bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{prov.label}</span>
                  <div className="flex items-center gap-2">
                    {status?.configured ? (
                      <>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ {status.masked || (status.baseURL ? "Proxy" : "OK")}
                        </span>
                        {status.baseURL && (
                          <span className="text-xs text-gray-400 font-mono">
                            {status.baseURL.slice(0, 30)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {isZh ? "未配置" : "Not configured"}
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isEditing) {
                          setEditingProvider(null);
                        } else {
                          setEditingProvider(prov.id);
                          setEditKey("");
                          setEditUrl(status?.baseURL || "");
                        }
                      }}
                    >
                      {isEditing
                        ? t("common.cancel")
                        : status?.configured
                          ? (isZh ? "修改" : "Change")
                          : (isZh ? "配置" : "Configure")}
                    </Button>
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-3 space-y-3 border-t pt-3">
                    <Input
                      label="API Key"
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      placeholder={prov.keyPlaceholder}
                      type="password"
                    />
                    <Input
                      label={isZh ? "Base URL（中转站，可选）" : "Base URL (proxy, optional)"}
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder={
                        prov.id === "glm"
                          ? "https://open.bigmodel.cn/api/paas/v4"
                          : prov.id === "anthropic"
                            ? "https://api.anthropic.com"
                            : "https://api.openai.com/v1"
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => saveProvider(prov.id)}
                      disabled={savingProvider || (!editKey && !editUrl)}
                    >
                      {savingProvider ? t("common.loading") : t("common.save")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* General Settings */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isZh ? "通用设置" : "General Settings"}
        </h2>
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isZh ? "默认 AI 提供商" : "Default AI Provider"}
            </label>
            <select
              value={settings.default_provider || "anthropic"}
              onChange={(e) => setSettings((s) => ({ ...s, default_provider: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI (GPT)</option>
              <option value="glm">GLM (智谱)</option>
            </select>
          </div>
          <Input
            label={isZh ? "完成后归档天数" : "Archive after days (completed)"}
            type="number"
            value={settings.archive_after_days || "30"}
            onChange={(e) => setSettings((s) => ({ ...s, archive_after_days: e.target.value }))}
          />
          <Input
            label={isZh ? "归档后清理天数" : "Cleanup after days (archived)"}
            type="number"
            value={settings.cleanup_after_days || "90"}
            onChange={(e) => setSettings((s) => ({ ...s, cleanup_after_days: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <Button onClick={saveSettings}>{t("common.save")}</Button>
            {saved && <span className="text-sm text-green-600">✓</span>}
          </div>
        </div>
      </section>

      {/* Skills */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {isZh ? "技能" : "Skills"} ({skills.length})
        </h2>
        {Object.entries(skillsBySource).map(([source, items]) => (
          <div key={source} className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {source} ({items.length})
            </h3>
            <div className="rounded-lg border bg-white divide-y">
              {items.map((skill) => (
                <div key={skill.name} className="px-4 py-3">
                  <span className="font-mono text-sm">{skill.name}</span>
                  {skill.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {skills.length === 0 && (
          <p className="text-gray-500 text-sm">
            {isZh ? "未找到技能（~/.claude/skills/）" : "No skills found in ~/.claude/skills/"}
          </p>
        )}
      </section>
    </div>
  );
}
