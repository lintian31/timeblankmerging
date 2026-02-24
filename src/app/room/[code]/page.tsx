"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TimeGrid } from "@/components/TimeGrid";
import { HeatMap } from "@/components/HeatMap";
import { Toast } from "@/components/Toast";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  Save,
  LogIn,
  Clock,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface Room {
  id: number;
  code: string;
  name: string;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
}

interface Participant {
  id: number;
  room_id: number;
  name: string;
}

interface TimeSlotData {
  id: number;
  participant_id: number;
  room_id: number;
  date: string;
  time_slot: string;
}

// Helper to generate date array
function generateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Helper to generate time slots (30 min intervals)
function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let h = startH;
  let m = startM;
  while (h < endH || (h === endH && m < endM)) {
    slots.push(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
    );
    m += 30;
    if (m >= 60) {
      m = 0;
      h++;
    }
  }
  return slots;
}

export default function RoomPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<TimeSlotData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Current user state
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [nickname, setNickname] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"select" | "result">("select");
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`);
      if (!res.ok) {
        setError("房间不存在");
        return;
      }
      const data = await res.json();
      setRoom(data.room);
      setParticipants(data.participants);
      setAllTimeSlots(data.timeSlots);
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    if (code) fetchRoom();
  }, [code, fetchRoom]);

  // Check localStorage for saved session
  useEffect(() => {
    if (!room) return;
    const saved = localStorage.getItem(`timeblank-user-${code}`);
    if (saved) {
      try {
        const user = JSON.parse(saved);
        setCurrentUser(user);
        setIsJoined(true);
        setNickname(user.name);
        // Restore user's selected slots
        const userSlots = allTimeSlots
          .filter((s) => s.participant_id === user.id)
          .map((s) => `${s.date}|${s.time_slot}`);
        setSelectedSlots(new Set(userSlots));
      } catch {
        localStorage.removeItem(`timeblank-user-${code}`);
      }
    }
  }, [room, code, allTimeSlots]);

  // Join room
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      const res = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nickname.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.participant);
        setIsJoined(true);
        localStorage.setItem(
          `timeblank-user-${code}`,
          JSON.stringify(data.participant)
        );
        // Restore any existing selections for this participant
        const userSlots = allTimeSlots
          .filter((s) => s.participant_id === data.participant.id)
          .map((s) => `${s.date}|${s.time_slot}`);
        setSelectedSlots(new Set(userSlots));
        showToast(`欢迎加入，${nickname.trim()}！`, "success");
        await fetchRoom();
      }
    } catch {
      showToast("加入失败，请重试", "error");
    }
  };

  // Save time slots
  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);

    const slots = Array.from(selectedSlots).map((key) => {
      const [date, time_slot] = key.split("|");
      return { date, time_slot };
    });

    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: currentUser.id,
          roomCode: code,
          slots,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAllTimeSlots(data.timeSlots);
        await fetchRoom();
        showToast(
          slots.length > 0
            ? `已保存 ${slots.length} 个空闲时段`
            : "已清除所有时间选择",
          "success"
        );
      }
    } catch {
      showToast("保存失败，请重试", "error");
    } finally {
      setSaving(false);
    }
  };

  // Copy room code
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast("口令已复制到剪贴板", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("复制失败", "error");
    }
  };

  // Compute dates & time slots arrays
  const dates = useMemo(
    () => (room ? generateDates(room.date_start, room.date_end) : []),
    [room]
  );

  const timeSlotLabels = useMemo(
    () => (room ? generateTimeSlots(room.time_start, room.time_end) : []),
    [room]
  );

  // Build slot -> participant names map for heat map
  const slotParticipants = useMemo(() => {
    const map = new Map<string, string[]>();
    const participantMap = new Map<number, string>();
    participants.forEach((p) => participantMap.set(p.id, p.name));

    allTimeSlots.forEach((slot) => {
      const key = `${slot.date}|${slot.time_slot}`;
      const name = participantMap.get(slot.participant_id);
      if (name) {
        const existing = map.get(key) || [];
        existing.push(name);
        map.set(key, existing);
      }
    });

    return map;
  }, [allTimeSlots, participants]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-4xl mb-2">😵</div>
            <p className="text-lg font-medium text-red-500">{error}</p>
            <p className="text-sm text-muted-foreground">
              请检查口令是否正确，或者创建一个新房间
            </p>
            <Link href="/">
              <Button
                variant="outline"
                className="rounded-xl mt-2"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-lg">{room.name}</h1>
              <p className="text-xs text-muted-foreground">
                {room.date_start} ~ {room.date_end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-mono tracking-wider"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <Copy className="mr-1 h-3 w-3" />
              )}
              {code}
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground bg-slate-100 px-3 py-1.5 rounded-xl">
              <Users className="h-3.5 w-3.5" />
              <span>{participants.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Join prompt */}
        {!isJoined && (
          <Card className="mb-6 border-violet-200 bg-gradient-to-r from-violet-50 to-indigo-50 shadow-sm">
            <CardContent className="pt-6">
              <form
                onSubmit={handleJoin}
                className="flex flex-col sm:flex-row items-center gap-3"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                  <LogIn className="h-4 w-4" />
                  输入昵称加入房间：
                </div>
                <Input
                  placeholder="你的昵称"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="max-w-48 rounded-xl"
                  required
                />
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
                >
                  加入
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "select" ? "default" : "outline"}
            className={`rounded-xl transition-all ${
              activeTab === "select"
                ? "bg-gradient-to-r from-violet-500 to-indigo-500 shadow-md shadow-violet-500/20"
                : ""
            }`}
            onClick={() => setActiveTab("select")}
          >
            <Clock className="mr-2 h-4 w-4" />
            选择时间
          </Button>
          <Button
            variant={activeTab === "result" ? "default" : "outline"}
            className={`rounded-xl transition-all ${
              activeTab === "result"
                ? "bg-gradient-to-r from-green-500 to-emerald-500 shadow-md shadow-green-500/20"
                : ""
            }`}
            onClick={() => setActiveTab("result")}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            查看结果
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "select" ? (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base">
                      {isJoined ? (
                        <span>
                          <span className="text-violet-600">
                            {currentUser?.name}
                          </span>
                          ，拖拽选择你的空闲时间
                        </span>
                      ) : (
                        "请先加入房间再选择时间"
                      )}
                    </CardTitle>
                    {isJoined && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs"
                          onClick={() => {
                            setSelectedSlots(new Set());
                          }}
                          disabled={selectedSlots.size === 0}
                        >
                          清除全部
                        </Button>
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          size="sm"
                          className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600"
                        >
                          <Save className="mr-1 h-3.5 w-3.5" />
                          {saving ? "保存中..." : "保存选择"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <TimeGrid
                    dates={dates}
                    timeSlots={timeSlotLabels}
                    selectedSlots={selectedSlots}
                    onSlotsChange={setSelectedSlots}
                    disabled={!isJoined}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-green-500" />
                    时间热力图 — 颜色越深表示越多人有空
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HeatMap
                    dates={dates}
                    timeSlots={timeSlotLabels}
                    slotParticipants={slotParticipants}
                    totalParticipants={participants.length}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Participants */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  参与者 ({participants.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    还没有人加入，快分享口令给朋友吧
                  </p>
                ) : (
                  <div className="space-y-2">
                    {participants.map((p) => {
                      const slotCount = allTimeSlots.filter(
                        (s) => s.participant_id === p.id
                      ).length;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            currentUser?.id === p.id
                              ? "bg-violet-100 text-violet-700 font-medium"
                              : "bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                slotCount > 0
                                  ? "bg-green-500"
                                  : "bg-slate-300"
                              }`}
                            />
                            <span className="truncate max-w-24">
                              {p.name}
                            </span>
                            {currentUser?.id === p.id && (
                              <span className="text-xs text-violet-500 shrink-0">
                                (你)
                              </span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {slotCount > 0
                              ? `${slotCount} 个时段`
                              : "未选择"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Room Info Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">房间信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">日期范围</span>
                  <span className="font-medium">
                    {room.date_start} ~ {room.date_end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">每日时段</span>
                  <span className="font-medium">
                    {room.time_start} ~ {room.time_end}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">时间粒度</span>
                  <span className="font-medium">30 分钟</span>
                </div>
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl"
                    onClick={handleCopy}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    复制口令分享给朋友
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
