"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DirEntry {
  name: string;
  path: string;
  isGitRepo: boolean;
}

interface GitHubRepo {
  name: string;
  fullName: string;
  description: string;
  cloneUrl: string;
  isPrivate: boolean;
  language: string;
}

interface RepoPickerProps {
  onSelect: (path: string) => void;
  locale: string;
}

export function RepoPicker({ onSelect, locale }: RepoPickerProps) {
  const isZh = locale === "zh";
  const [tab, setTab] = useState<"local" | "github">("local");

  return (
    <div>
      <div className="flex gap-2 mb-3 border-b">
        <button
          onClick={() => setTab("local")}
          className={`py-2 px-3 text-sm font-medium border-b-2 ${
            tab === "local"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          }`}
        >
          {isZh ? "本地目录" : "Local Directory"}
        </button>
        <button
          onClick={() => setTab("github")}
          className={`py-2 px-3 text-sm font-medium border-b-2 ${
            tab === "github"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500"
          }`}
        >
          GitHub
        </button>
      </div>

      {tab === "local" ? (
        <LocalBrowser onSelect={onSelect} isZh={isZh} />
      ) : (
        <GitHubBrowser onSelect={onSelect} isZh={isZh} />
      )}
    </div>
  );
}

function LocalBrowser({
  onSelect,
  isZh,
}: {
  onSelect: (path: string) => void;
  isZh: boolean;
}) {
  const [currentPath, setCurrentPath] = useState("");
  const [parentPath, setParentPath] = useState("");
  const [dirs, setDirs] = useState<DirEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const browse = async (dirPath?: string) => {
    setLoading(true);
    const params = dirPath ? `?path=${encodeURIComponent(dirPath)}` : "";
    const res = await fetch(`/api/filesystem${params}`);
    const data = await res.json();
    if (res.ok) {
      setCurrentPath(data.current);
      setParentPath(data.parent);
      setDirs(data.dirs);
    }
    setLoading(false);
  };

  useEffect(() => {
    browse();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => browse(parentPath)}
          disabled={currentPath === parentPath}
        >
          ..
        </Button>
        <span className="text-xs text-gray-500 font-mono truncate flex-1">
          {currentPath}
        </span>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-4">
          {isZh ? "加载中..." : "Loading..."}
        </p>
      ) : (
        <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
          {dirs.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              {isZh ? "无子目录" : "No subdirectories"}
            </p>
          ) : (
            dirs.map((dir) => (
              <div
                key={dir.path}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <button
                  onClick={() => browse(dir.path)}
                  className="flex items-center gap-2 text-sm text-left flex-1 min-w-0"
                >
                  <span>{dir.isGitRepo ? "📦" : "📁"}</span>
                  <span className="truncate">{dir.name}</span>
                  {dir.isGitRepo && (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                      git
                    </span>
                  )}
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSelect(dir.path)}
                >
                  {isZh ? "选择" : "Select"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      <Button
        variant="secondary"
        size="sm"
        className="mt-2 w-full"
        onClick={() => onSelect(currentPath)}
      >
        {isZh ? "选择当前目录" : "Select Current Directory"}: {currentPath.split("/").pop()}
      </Button>
    </div>
  );
}

function GitHubBrowser({
  onSelect,
  isZh,
}: {
  onSelect: (path: string) => void;
  isZh: boolean;
}) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cloning, setCloning] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchRepos = async (query?: string) => {
    setLoading(true);
    setError("");
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await fetch(`/api/github${params}`);
    const data = await res.json();
    if (res.ok) {
      setRepos(data);
    } else {
      setError(data.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleClone = async (repo: GitHubRepo) => {
    setCloning(repo.fullName);
    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: repo.cloneUrl }),
    });
    const data = await res.json();
    setCloning(null);
    if (res.ok) {
      onSelect(data.path);
    } else {
      setError(data.error);
    }
  };

  const handleSearch = () => {
    if (search.trim()) {
      fetchRepos(search.trim());
    } else {
      fetchRepos();
    }
  };

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-500 text-sm mb-2">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => fetchRepos()}>
          {isZh ? "重试" : "Retry"}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isZh ? "搜索仓库..." : "Search repos..."}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button variant="secondary" size="sm" onClick={handleSearch}>
          {isZh ? "搜索" : "Search"}
        </Button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm text-center py-4">
          {isZh ? "加载中..." : "Loading..."}
        </p>
      ) : (
        <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
          {repos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">
              {isZh ? "无仓库" : "No repos found"}
            </p>
          ) : (
            repos.map((repo) => (
              <div
                key={repo.fullName}
                className="flex items-center justify-between px-3 py-2 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {repo.fullName}
                    </span>
                    {repo.isPrivate && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        private
                      </span>
                    )}
                    {repo.language && (
                      <span className="text-xs text-blue-600">
                        {repo.language}
                      </span>
                    )}
                  </div>
                  {repo.description && (
                    <p className="text-xs text-gray-500 truncate">
                      {repo.description}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleClone(repo)}
                  disabled={cloning !== null}
                >
                  {cloning === repo.fullName
                    ? isZh
                      ? "克隆中..."
                      : "Cloning..."
                    : isZh
                      ? "克隆"
                      : "Clone"}
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
