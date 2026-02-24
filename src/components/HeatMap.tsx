"use client";

import { useState, useMemo, Fragment } from "react";

interface HeatMapProps {
  dates: string[];
  timeSlots: string[];
  // Map from "YYYY-MM-DD|HH:MM" to array of participant names
  slotParticipants: Map<string, string[]>;
  totalParticipants: number;
}

export function HeatMap({
  dates,
  timeSlots,
  slotParticipants,
  totalParticipants,
}: HeatMapProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Find best time slots (where everyone is available)
  const bestSlots = useMemo(() => {
    if (totalParticipants === 0) return [];
    const slots: { key: string; count: number }[] = [];
    slotParticipants.forEach((names, key) => {
      slots.push({ key, count: names.length });
    });
    slots.sort((a, b) => b.count - a.count);
    return slots.slice(0, 5);
  }, [slotParticipants, totalParticipants]);

  const getColor = (count: number): string => {
    if (count === 0) return "transparent";
    if (totalParticipants === 0) return "transparent";

    const ratio = count / totalParticipants;
    if (ratio < 0.3) return "rgba(74, 222, 128, 0.35)";
    if (ratio < 0.5) return "rgba(34, 197, 94, 0.50)";
    if (ratio < 0.75) return "rgba(22, 163, 74, 0.70)";
    if (ratio < 1) return "rgba(21, 128, 61, 0.85)";
    return "rgba(5, 100, 40, 0.95)"; // Full match - dark green
  };

  const getCellKey = (date: string, time: string) => `${date}|${time}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekday = weekdays[date.getDay()];
    return { display: `${month}/${day}`, weekday: `周${weekday}` };
  };

  const hoveredNames = hoveredSlot
    ? slotParticipants.get(hoveredSlot) || []
    : [];

  const formatSlotKey = (key: string) => {
    const [date, time] = key.split("|");
    const d = new Date(date + "T00:00:00");
    const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
    return `${d.getMonth() + 1}/${d.getDate()} 周${weekdays[d.getDay()]} ${time}`;
  };

  return (
    <div className="select-none relative">
      {/* Best times summary */}
      {bestSlots.length > 0 && bestSlots[0].count > 1 && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
          <div className="text-sm font-medium text-green-800 mb-2">
            最佳时间 — {bestSlots[0].count}/{totalParticipants} 人可用
          </div>
          <div className="flex flex-wrap gap-1.5">
            {bestSlots
              .filter((s) => s.count === bestSlots[0].count)
              .slice(0, 8)
              .map((s) => (
                <span
                  key={s.key}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md"
                >
                  {formatSlotKey(s.key)}
                </span>
              ))}
            {bestSlots.filter((s) => s.count === bestSlots[0].count).length >
              8 && (
              <span className="text-xs text-green-600 px-2 py-1">
                等{" "}
                {bestSlots.filter((s) => s.count === bestSlots[0].count)
                  .length - 8}{" "}
                个时段...
              </span>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60">
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
                  const names = slotParticipants.get(key) || [];
                  const count = names.length;
                  const isFullMatch =
                    count === totalParticipants && totalParticipants > 0;

                  return (
                    <div
                      key={key}
                      className={`h-7 border-r border-border/20 relative transition-all duration-75 cursor-default ${
                        isFullMatch ? "ring-1 ring-inset ring-green-500/30" : ""
                      }`}
                      style={{
                        backgroundColor: getColor(count),
                        borderBottom:
                          timeIdx === timeSlots.length - 1
                            ? "none"
                            : time.endsWith(":00")
                              ? "1px solid hsl(var(--border) / 0.6)"
                              : "1px dashed hsl(var(--border) / 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        setHoveredSlot(key);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPos({
                          x: rect.left + rect.width / 2,
                          y: rect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredSlot(null)}
                    >
                      {count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90">
                          {count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredSlot && hoveredNames.length > 0 && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x,
            top: tooltipPos.y - 8,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-52">
            <div className="font-medium mb-1 text-slate-300">
              {formatSlotKey(hoveredSlot)}
            </div>
            <div className="font-semibold">
              {hoveredNames.length}/{totalParticipants} 人有空
            </div>
            <div className="mt-1 text-slate-300">
              {hoveredNames.join("、")}
            </div>
            <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-slate-800" />
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {totalParticipants > 0 && (
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>0人</span>
          <div className="flex gap-0.5">
            <div
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(74, 222, 128, 0.35)" }}
            />
            <div
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.50)" }}
            />
            <div
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(22, 163, 74, 0.70)" }}
            />
            <div
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(21, 128, 61, 0.85)" }}
            />
            <div
              className="w-5 h-3 rounded-sm"
              style={{ backgroundColor: "rgba(5, 100, 40, 0.95)" }}
            />
          </div>
          <span>全员</span>
        </div>
      )}

      {totalParticipants === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          还没有人提交时间，热力图将在有人选择时间后显示
        </div>
      )}
    </div>
  );
}
