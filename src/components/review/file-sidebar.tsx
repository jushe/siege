"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

interface FileEntry {
  filePath: string;
  additions: number;
  deletions: number;
  findingCount: number;
}

interface FileSidebarProps {
  files: FileEntry[];
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
}

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  file: FileEntry | null;
}

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", fullPath: "", children: new Map(), file: null };

  for (const file of files) {
    const parts = file.filePath.split("/");
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          fullPath: parts.slice(0, i + 1).join("/"),
          children: new Map(),
          file: null,
        });
      }
      current = current.children.get(part)!;
    }
    current.file = file;
  }

  return root;
}

// Collapse single-child directories: a/b/c → a/b/c
function collapseTree(node: TreeNode): TreeNode {
  if (node.children.size === 1 && !node.file) {
    const child = [...node.children.values()][0];
    if (!child.file) {
      const collapsed = collapseTree(child);
      return {
        ...collapsed,
        name: node.name ? `${node.name}/${collapsed.name}` : collapsed.name,
      };
    }
  }
  const newChildren = new Map<string, TreeNode>();
  for (const [key, child] of node.children) {
    newChildren.set(key, collapseTree(child));
  }
  return { ...node, children: newChildren };
}

function DirNode({
  node,
  selectedFile,
  onSelectFile,
  depth,
}: {
  node: TreeNode;
  selectedFile: string | null;
  onSelectFile: (filePath: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);

  // Sort: directories first, then files, alphabetically
  const entries = [...node.children.values()].sort((a, b) => {
    const aIsDir = a.children.size > 0 && !a.file;
    const bIsDir = b.children.size > 0 && !b.file;
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      {/* Directory header (skip for root) */}
      {node.name && !node.file && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <svg
            className={`w-3 h-3 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-mono truncate">{node.name}</span>
        </button>
      )}

      {/* File leaf */}
      {node.file && (
        <FileLeaf
          file={node.file}
          name={node.name}
          depth={depth}
          isActive={selectedFile === node.file.filePath}
          onSelect={() => onSelectFile(node.file!.filePath)}
        />
      )}

      {/* Children */}
      {expanded &&
        entries.map((child) => (
          <DirNode
            key={child.fullPath}
            node={child}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            depth={node.name && !node.file ? depth + 1 : depth}
          />
        ))}
    </div>
  );
}

function FileLeaf({
  file,
  name,
  depth,
  isActive,
  onSelect,
}: {
  file: FileEntry;
  name: string;
  depth: number;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors hover:opacity-80"
      style={{
        paddingLeft: `${depth * 12 + 8}px`,
        ...(isActive
          ? { background: "var(--card-border)", color: "var(--foreground)" }
          : { color: "var(--muted)" }),
      }}
      title={file.filePath}
    >
      <FileIcon name={name} />
      <span className="font-mono truncate flex-1">{name}</span>
      <span className="flex items-center gap-1 shrink-0">
        {file.findingCount > 0 && (
          <span className="px-1 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] leading-none">
            {file.findingCount}
          </span>
        )}
        {file.additions > 0 && (
          <span className="text-green-600 text-[10px]">+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className="text-red-600 text-[10px]">-{file.deletions}</span>
        )}
      </span>
    </button>
  );
}

function FileIcon({ name }: { name: string }) {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  let color = "text-gray-400";
  if ([".ts", ".tsx"].includes(ext)) color = "text-blue-500";
  else if ([".js", ".jsx"].includes(ext)) color = "text-yellow-500";
  else if ([".rs"].includes(ext)) color = "text-orange-600";
  else if ([".go"].includes(ext)) color = "text-cyan-500";
  else if ([".py"].includes(ext)) color = "text-green-500";
  else if ([".json", ".yaml", ".yml", ".toml"].includes(ext)) color = "text-purple-500";
  else if ([".md"].includes(ext)) color = "text-gray-500";
  else if ([".css", ".scss"].includes(ext)) color = "text-pink-500";
  else if ([".sh", ".bash"].includes(ext)) color = "text-green-600";

  return (
    <svg className={`w-3.5 h-3.5 shrink-0 ${color}`} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FileSidebar({ files, selectedFile, onSelectFile }: FileSidebarProps) {
  const t = useTranslations();

  const tree = useMemo(() => {
    const raw = buildTree(files);
    return collapseTree(raw);
  }, [files]);

  if (files.length === 0) {
    return (
      <div className="w-64 border-r p-4">
        <p className="text-sm text-gray-500">{t("review.noChanges")}</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-r overflow-y-auto bg-white">
      <div className="p-3 border-b bg-gray-50">
        <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {t("review.changedFiles")}
        </h5>
        <span className="text-[10px] text-gray-400">{files.length} files</span>
      </div>
      <div className="py-1">
        <DirNode
          node={tree}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          depth={0}
        />
      </div>
    </div>
  );
}
