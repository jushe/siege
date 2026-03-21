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

interface RunTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onRun: (skills: string[], provider?: string, model?: string) => void;
  taskTitle: string;
}

export function RunTaskDialog({ open, onClose, onRun, taskTitle }: RunTaskDialogProps) {
  const t = useTranslations();
  const isZh = t("common.back") === "返回";
  const [skills, setSkills] = useState<SkillSummary[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const defaultProvider = useDefaultProvider();
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");

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
    <Dialog open={open} onClose={onClose} title={isZh ? `执行: ${taskTitle}` : `Run: ${taskTitle}`}>
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
          <Button onClick={() => { onRun(selectedSkills, provider || undefined, model || undefined); onClose(); }}>
            {isZh ? "开始执行" : "Run"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
