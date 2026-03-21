"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface QuestionData {
  id: string;
  text: string;
  options: string[];
  default?: string;
}

interface SchemeQuestionDialogProps {
  open: boolean;
  question: QuestionData | null;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (questionId: string, answer: string) => void;
}

export function SchemeQuestionDialog({
  open,
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
}: SchemeQuestionDialogProps) {
  const t = useTranslations();
  const isZh = t("common.back") === "返回";
  const [selected, setSelected] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  if (!question) return null;

  const handleSubmit = () => {
    const answer = useCustom ? custom.trim() : (selected || question.default || question.options[0] || "");
    if (!answer) return;
    onAnswer(question.id, answer);
    // Reset for next question
    setSelected(null);
    setCustom("");
    setUseCustom(false);
  };

  const handleUseDefault = () => {
    const answer = question.default || question.options[0] || "";
    if (!answer) return;
    onAnswer(question.id, answer);
    setSelected(null);
    setCustom("");
    setUseCustom(false);
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}} // Can't close — must answer
      title={isZh
        ? `决策点 ${questionNumber}/${totalQuestions}`
        : `Decision ${questionNumber}/${totalQuestions}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full" style={{ background: "var(--card-border)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%`, background: "var(--accent, #3b82f6)" }}
          />
        </div>

        {/* Question text */}
        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
          {question.text}
        </p>

        {/* Options */}
        {question.options.length > 0 && (
          <div className="space-y-2">
            {question.options.map((opt) => (
              <label
                key={opt}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  !useCustom && selected === opt ? "ring-2 ring-blue-400" : ""
                }`}
                style={{
                  background: !useCustom && selected === opt ? "rgba(59,130,246,0.08)" : "var(--card)",
                  borderColor: !useCustom && selected === opt ? "rgba(59,130,246,0.4)" : "var(--card-border)",
                }}
              >
                <input
                  type="radio"
                  name="question-option"
                  checked={!useCustom && selected === opt}
                  onChange={() => { setSelected(opt); setUseCustom(false); }}
                  className="mt-0.5"
                />
                <span className="text-sm" style={{ color: "var(--foreground)" }}>
                  {opt}
                  {opt === question.default && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--card-border)", color: "var(--muted)" }}>
                      {isZh ? "推荐" : "recommended"}
                    </span>
                  )}
                </span>
              </label>
            ))}

            {/* Custom answer option */}
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                useCustom ? "ring-2 ring-blue-400" : ""
              }`}
              style={{
                background: useCustom ? "rgba(59,130,246,0.08)" : "var(--card)",
                borderColor: useCustom ? "rgba(59,130,246,0.4)" : "var(--card-border)",
              }}
            >
              <input
                type="radio"
                name="question-option"
                checked={useCustom}
                onChange={() => setUseCustom(true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <span className="text-sm" style={{ color: "var(--foreground)" }}>
                  {isZh ? "自定义回答" : "Custom answer"}
                </span>
                {useCustom && (
                  <textarea
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    autoFocus
                    rows={2}
                    className="mt-2 w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--card-border)" }}
                    placeholder={isZh ? "输入你的想法..." : "Type your answer..."}
                  />
                )}
              </div>
            </label>
          </div>
        )}

        {/* No options — free text only */}
        {question.options.length === 0 && (
          <textarea
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setUseCustom(true); }}
            autoFocus
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            style={{ background: "var(--card)", color: "var(--foreground)", borderColor: "var(--card-border)" }}
            placeholder={isZh ? "输入你的想法..." : "Type your answer..."}
          />
        )}

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleUseDefault}>
            {isZh ? "使用推荐" : "Use Default"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={useCustom ? !custom.trim() : !selected}
          >
            {isZh ? "确认选择" : "Submit"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
