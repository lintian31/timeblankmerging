"use client";

import { useState, useCallback, useRef, useEffect, Fragment } from "react";

interface TimeGridProps {
  dates: string[]; // YYYY-MM-DD
  timeSlots: string[]; // HH:MM
  selectedSlots: Set<string>; // "YYYY-MM-DD|HH:MM"
  onSlotsChange: (slots: Set<string>) => void;
  disabled?: boolean;
}

export function TimeGrid({
  dates,
  timeSlots,
  selectedSlots,
  onSlotsChange,
  disabled = false,
}: TimeGridProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");
  const draggedCells = useRef<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);

  const getCellKey = (date: string, time: string) => `${date}|${time}`;

  const handleCellActivate = useCallback(
    (date: string, time: string, isStart: boolean) => {
      if (disabled) return;
      const key = getCellKey(date, time);

      if (isStart) {
        const isSelected = selectedSlots.has(key);
        setDragMode(isSelected ? "deselect" : "select");
        setIsDragging(true);
        draggedCells.current = new Set([key]);

        const newSlots = new Set(selectedSlots);
        if (isSelected) {
          newSlots.delete(key);
        } else {
          newSlots.add(key);
        }
        onSlotsChange(newSlots);
      } else if (isDragging) {
        if (draggedCells.current.has(key)) return;
        draggedCells.current.add(key);

        const newSlots = new Set(selectedSlots);
        if (dragMode === "select") {
          newSlots.add(key);
        } else {
          newSlots.delete(key);
        }
        onSlotsChange(newSlots);
      }
    },
    [selectedSlots, onSlotsChange, disabled, isDragging, dragMode]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    draggedCells.current = new Set();
  }, []);

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [handleMouseUp]);

  // Touch support - resolve cell from coordinates
  const getCellFromPoint = useCallback(
    (x: number, y: number): { date: string; time: string } | null => {
      const element = document.elementFromPoint(x, y);
      if (!element) return null;
      const date = element.getAttribute("data-date");
      const time = element.getAttribute("data-time");
      if (date && time) return { date, time };
      return null;
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      const touch = e.touches[0];
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      if (cell) {
        e.preventDefault();
        handleCellActivate(cell.date, cell.time, true);
      }
    },
    [disabled, getCellFromPoint, handleCellActivate]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;
      const touch = e.touches[0];
      const cell = getCellFromPoint(touch.clientX, touch.clientY);
      if (cell) {
        e.preventDefault();
        handleCellActivate(cell.date, cell.time, false);
      }
    },
    [isDragging, disabled, getCellFromPoint, handleCellActivate]
  );

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return { display: `${month}/${day}`, weekday: `周${weekday}` };
  };

  const selectedCount = selectedSlots.size;
  const totalHours = (selectedCount * 30) / 60;

  return (
    <div className="select-none" ref={gridRef}>
      {/* Selection summary */}
      {selectedCount > 0 && !disabled && (
        <div className="mb-3 text-sm text-muted-foreground flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-violet-400" />
          已选择 {selectedCount} 个时段（共 {totalHours} 小时）
        </div>
      )}

      <div
        className="overflow-x-auto rounded-xl border border-border/60"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        <div className="inline-block min-w-full">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `72px repeat(${dates.length}, minmax(56px, 1fr))`,
            }}
          >
            {/* Header row */}
            <div className="sticky left-0 z-10 bg-slate-50 border-b border-r border-border/60 p-2" />
            {dates.map((date) => {
              const { display, weekday } = formatDate(date);
              const isWeekend =
                new Date(date + "T00:00:00").getDay() === 0 ||
                new Date(date + "T00:00:00").getDay() === 6;
              return (
                <div
                  key={date}
                  className={`text-center border-b border-border/60 p-2 ${
                    isWeekend ? "bg-orange-50" : "bg-slate-50"
                  }`}
                >
                  <div
                    className={`text-xs ${
                      isWeekend
                        ? "text-orange-500 font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {weekday}
                  </div>
                  <div className="text-sm font-medium">{display}</div>
                </div>
              );
            })}

            {/* Time rows */}
            {timeSlots.map((time, timeIdx) => (
              <Fragment key={time}>
                {/* Time label */}
                <div
                  className="sticky left-0 z-10 bg-white border-r border-border/60 flex items-center justify-center text-xs text-muted-foreground font-mono"
                  style={{
                    borderBottom:
                      timeIdx === timeSlots.length - 1
                        ? "none"
                        : time.endsWith(":00")
                          ? "1px solid hsl(var(--border) / 0.6)"
                          : "1px dashed hsl(var(--border) / 0.3)",
                  }}
                >
                  {time.endsWith(":00") ? time : ""}
                </div>

                {/* Cells */}
                {dates.map((date) => {
                  const key = getCellKey(date, time);
                  const isSelected = selectedSlots.has(key);

                  return (
                    <div
                      key={key}
                      data-date={date}
                      data-time={time}
                      className={`
                        h-7 border-r border-border/20 cursor-pointer transition-colors duration-75
                        ${
                          isSelected
                            ? "bg-violet-400 hover:bg-violet-500"
                            : "hover:bg-violet-100"
                        }
                        ${disabled ? "cursor-not-allowed opacity-60" : ""}
                      `}
                      style={{
                        borderBottom:
                          timeIdx === timeSlots.length - 1
                            ? "none"
                            : time.endsWith(":00")
                              ? "1px solid hsl(var(--border) / 0.6)"
                              : "1px dashed hsl(var(--border) / 0.3)",
                      }}
                      onMouseDown={() =>
                        handleCellActivate(date, time, true)
                      }
                      onMouseEnter={() =>
                        handleCellActivate(date, time, false)
                      }
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
