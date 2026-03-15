"use client";

import { useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface CreatePlanDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
}

export function CreatePlanDialog({
  open,
  onClose,
  onSubmit,
}: CreatePlanDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [userEditedName, setUserEditedName] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestTitle = useCallback(
    async (desc: string) => {
      if (userEditedName || desc.trim().length < 10) return;

      setSuggesting(true);
      try {
        const res = await fetch("/api/plans/suggest-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: desc }),
        });
        if (res.ok) {
          const data = await res.json();
          if (!userEditedName) {
            setName(data.title);
          }
        }
      } catch {
        // ignore errors
      } finally {
        setSuggesting(false);
      }
    },
    [userEditedName]
  );

  const handleDescriptionChange = (value: string) => {
    setDescription(value);

    // Debounce title suggestion
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      suggestTitle(value);
    }, 1500);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setUserEditedName(true);
  };

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({ name, description });
    setName("");
    setDescription("");
    setUserEditedName(false);
    onClose();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setUserEditedName(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={t("plan.create")}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("plan.description")}
          </label>
          <MarkdownEditor
            value={description}
            onChange={handleDescriptionChange}
            height={150}
            placeholder={
              t("plan.description") + "..."
            }
          />
          <p className="text-xs text-gray-400 mt-1">
            {suggesting
              ? t("common.loading")
              : ""}
          </p>
        </div>
        <div>
          <Input
            label={t("plan.name")}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder={suggesting ? t("common.loading") : ""}
          />
          {!userEditedName && name && (
            <p className="text-xs text-gray-400 mt-1">
              AI generated — edit to customize
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name || suggesting}
          >
            {t("common.create")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
