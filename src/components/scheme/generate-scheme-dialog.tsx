"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProviderModelSelect, useDefaultProvider } from "@/components/ui/provider-model-select";

interface SkillSummary {
  name: string;
  source: string;
  description: string;
}

interface GenerateSchemeDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (provider: string, skills: string[], model?: string, interactive?: boolean, idea?: string) => void;
  generating: boolean;
}

export function GenerateSchemeDialog({
  open,
  onClose,
  onGenerate,
  generating,
}: GenerateSchemeDialogProps) {
  const t = useTranslations();
  const isZh = t("common.back") === "返回";
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const defaultProvider = useDefaultProvider();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [interactiveMode, setInteractiveMode] = useState(true);
  const [idea, setIdea] = useState("");

  useEffect(() => {
    if (defaultProvider && !provider) setProvider(defaultProvider);
  }, [defaultProvider]);

  useEffect(() => {
    if (open) {
      fetch("/api/skills").then(r => r.json()).then(setSkills).catch(() => {});
    }
  }, [open]);

  const toggleSkill = (name: string) => {
    setSelectedSkills(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const bySource = skills.reduce<Record<string, SkillSummary[]>>(
    (acc, s) => { if (!acc[s.source]) acc[s.source] = []; acc[s.source].push(s); return acc; }, {}
  );

  return (
    <Dialog open={open} onClose={onClose} title={t("scheme.generate")}>
      <div className="space-y-4">
        {/* Provider + Model */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
            {t("generate.provider")}
          </label>
          <ProviderModelSelect
            provider={provider}
            model={model}
            onProviderChange={setProvider}
            onModelChange={setModel}
            disabled={generating}
          />
        </div>

        {/* Interactive mode toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className="relative w-10 h-5 rounded-full transition-colors"
            style={{ background: interactiveMode ? "#22c55e" : "var(--card-border)" }}
            onClick={() => setInteractiveMode(!interactiveMode)}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${interactiveMode ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
          <div>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {isZh ? "交互模式" : "Interactive Mode"}
            </span>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {isZh ? "AI 会在生成过程中询问关键设计决策" : "AI will ask key design questions during generation"}
            </p>
          </div>
        </label>

        {/* User idea / approach */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
            {isZh ? "基本思路（可选）" : "Your Approach (optional)"}
          </label>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={isZh ? "描述你的初步想法、技术选型、约束条件等..." : "Describe your initial ideas, tech choices, constraints..."}
            className="w-full rounded-md border px-3 py-2 text-sm resize-none"
            style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--card-border)", minHeight: "80px" }}
            rows={3}
          />
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--foreground)" }}>
              {t("generate.skills")} ({selectedSkills.length})
            </label>
            <div className="max-h-48 overflow-y-auto border rounded-md divide-y" style={{ borderColor: "var(--card-border)" }}>
              {Object.entries(bySource).map(([source, items]) => (
                <div key={source}>
                  <div className="px-3 py-1.5 text-xs font-medium" style={{ background: "var(--background)", color: "var(--muted)" }}>{source}</div>
                  {items.map(skill => (
                    <label key={skill.name} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill.name)}
                        onChange={() => toggleSkill(skill.name)}
                        className="rounded"
                      />
                      <div className="min-w-0">
                        <span className="text-sm font-mono truncate block">{skill.name}</span>
                        {skill.description && <span className="text-xs truncate block" style={{ color: "var(--muted)" }}>{skill.description}</span>}
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            onClick={() => onGenerate(provider, selectedSkills, model || undefined, interactiveMode, idea.trim() || undefined)}
            disabled={generating}
          >
            {generating ? t("common.loading") : t("scheme.generate")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
