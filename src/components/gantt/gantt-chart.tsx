"use client";

import { useRef, useState, useCallback } from "react";

interface GanttTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  custom_class?: string;
}

interface GanttChartProps {
  tasks: GanttTask[];
  onDateChange?: (taskId: string, start: Date, end: Date) => void;
  onProgressChange?: (taskId: string, progress: number) => void;
  onClick?: (taskId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "#22c55e",
  failed: "#ef4444",
  "": "#3b82f6",
};

export function GanttChart({ tasks, onDateChange, onClick }: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    mode: "move" | "resize";
    startX: number;
    origStart: number;
    origEnd: number;
  } | null>(null);
  const [preview, setPreview] = useState<{ taskId: string; startMs: number; endMs: number } | null>(null);

  if (tasks.length === 0) return null;

  const dates = tasks.flatMap((t) => [new Date(t.start), new Date(t.end)]);
  const minMs = Math.min(...dates.map((d) => d.getTime()));
  const maxMs = Math.max(...dates.map((d) => d.getTime()));
  const totalMs = maxMs - minMs || 1;

  const formatDate = (d: string | Date) => {
    const date = typeof d === "string" ? new Date(d) : d;
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const pxToMs = useCallback((px: number) => {
    if (!containerRef.current) return 0;
    // get the timeline area width (container minus the name column and progress column)
    const timelineEl = containerRef.current.querySelector("[data-timeline]") as HTMLElement;
    if (!timelineEl) return 0;
    const timelineWidth = timelineEl.offsetWidth;
    return (px / timelineWidth) * totalMs;
  }, [totalMs]);

  const handlePointerDown = (
    e: React.PointerEvent,
    taskId: string,
    mode: "move" | "resize"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const origStart = new Date(task.start).getTime();
    const origEnd = new Date(task.end).getTime();

    setDragState({ taskId, mode, startX: e.clientX, origStart, origEnd });
    setPreview({ taskId, startMs: origStart, endMs: origEnd });

    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    const deltaMs = pxToMs(e.clientX - dragState.startX);

    if (dragState.mode === "move") {
      setPreview({
        taskId: dragState.taskId,
        startMs: dragState.origStart + deltaMs,
        endMs: dragState.origEnd + deltaMs,
      });
    } else {
      // resize: only change end, enforce minimum 30 min
      const newEnd = Math.max(dragState.origStart + 30 * 60000, dragState.origEnd + deltaMs);
      setPreview({
        taskId: dragState.taskId,
        startMs: dragState.origStart,
        endMs: newEnd,
      });
    }
  };

  const handlePointerUp = () => {
    if (!dragState || !preview) {
      setDragState(null);
      setPreview(null);
      return;
    }

    // Only trigger change if actually moved
    const movedMs = Math.abs(preview.startMs - dragState.origStart) + Math.abs(preview.endMs - dragState.origEnd);
    if (movedMs > 60000 && onDateChange) {
      onDateChange(dragState.taskId, new Date(preview.startMs), new Date(preview.endMs));
    }

    setDragState(null);
    setPreview(null);
  };

  return (
    <div
      ref={containerRef}
      className="rounded-lg border bg-white p-4 overflow-x-auto select-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className="min-w-[500px]">
        {tasks.map((task) => {
          const isPreview = preview?.taskId === task.id;
          const startMs = isPreview ? preview.startMs : new Date(task.start).getTime();
          const endMs = isPreview ? preview.endMs : new Date(task.end).getTime();

          const startOffset = ((startMs - minMs) / totalMs) * 100;
          const width = ((endMs - startMs) / totalMs) * 100 || 5;
          const barColor = STATUS_COLORS[task.custom_class || ""] || STATUS_COLORS[""];
          const isDragging = dragState?.taskId === task.id;

          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 py-1.5 rounded px-2 ${
                isDragging ? "" : "cursor-pointer hover:bg-gray-50"
              }`}
              onClick={() => !isDragging && onClick?.(task.id)}
            >
              <div className="w-36 text-xs text-gray-600 truncate flex-shrink-0">
                {task.name}
              </div>
              <div className="flex-1 relative h-7 bg-gray-100 rounded-full overflow-visible" data-timeline>
                {/* Bar */}
                <div
                  className="absolute h-full rounded-full flex items-center"
                  style={{
                    left: `${startOffset}%`,
                    width: `${Math.max(width, 1.5)}%`,
                    backgroundColor: barColor,
                    cursor: onDateChange ? "grab" : "pointer",
                    opacity: isDragging ? 0.8 : 1,
                    zIndex: isDragging ? 10 : 1,
                    transition: isDragging ? "none" : "left 0.2s, width 0.2s",
                  }}
                  onPointerDown={(e) => onDateChange && handlePointerDown(e, task.id, "move")}
                >
                  {/* Progress overlay */}
                  {task.progress > 0 && task.progress < 100 && (
                    <div
                      className="absolute inset-y-0 bg-white/30 rounded-full"
                      style={{ width: `${100 - task.progress}%`, right: 0 }}
                    />
                  )}

                  {/* Date label inside bar */}
                  <span className="text-[9px] text-white/90 truncate px-1.5 pointer-events-none whitespace-nowrap">
                    {formatDate(isPreview ? new Date(startMs) : task.start)}
                    {" → "}
                    {formatDate(isPreview ? new Date(endMs) : task.end)}
                  </span>

                  {/* Resize handle (right edge) */}
                  {onDateChange && (
                    <div
                      className="absolute right-0 top-0 w-2 h-full cursor-ew-resize rounded-r-full hover:bg-white/30"
                      onPointerDown={(e) => handlePointerDown(e, task.id, "resize")}
                    />
                  )}
                </div>
              </div>
              <div className="w-12 text-xs text-right text-gray-500 flex-shrink-0">
                {task.progress}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
