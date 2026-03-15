"use client";

import { useState } from "react";
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

  const handleSubmit = () => {
    if (!name) return;
    onSubmit({ name, description });
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("plan.create")}>
      <div className="space-y-4">
        <Input
          label={t("plan.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("plan.description")}
          </label>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            height={150}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            {t("common.create")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
