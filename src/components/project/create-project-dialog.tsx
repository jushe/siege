"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    targetRepoPath: string;
  }) => void;
}

export function CreateProjectDialog({
  open,
  onClose,
  onSubmit,
}: CreateProjectDialogProps) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetRepoPath, setTargetRepoPath] = useState("");

  const handleSubmit = () => {
    if (!name || !targetRepoPath) return;
    onSubmit({ name, description, targetRepoPath });
    setName("");
    setDescription("");
    setTargetRepoPath("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={t("project.create")}>
      <div className="space-y-4">
        <Input
          label={t("project.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("project.description")}
          </label>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            height={150}
          />
        </div>
        <Input
          label={t("project.targetRepoPath")}
          value={targetRepoPath}
          onChange={(e) => setTargetRepoPath(e.target.value)}
          placeholder="/home/user/my-project"
          required
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !targetRepoPath}>
            {t("common.create")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
