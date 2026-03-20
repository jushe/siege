"use client";

import { useState, ReactNode } from "react";

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const active = tabs.find((t) => t.id === activeTab);

  return (
    <div>
      <div style={{ borderBottom: "1px solid var(--card-border)" }}>
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors
                ${activeTab === tab.id ? "" : "border-transparent"}
                ${tab.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              style={activeTab === tab.id
                ? { borderColor: "var(--foreground)", color: "var(--foreground)" }
                : { color: "var(--muted)" }
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-4">{active?.content}</div>
    </div>
  );
}
