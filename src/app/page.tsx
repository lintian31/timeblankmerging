"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { Users, Clock, Sparkles, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    setJoining(true);
    setJoinError("");
    try {
      const res = await fetch(`/api/rooms/${roomCode.toUpperCase()}`);
      if (res.ok) {
        router.push(`/room/${roomCode.toUpperCase()}`);
      } else {
        setJoinError("房间不存在，请检查口令是否正确");
      }
    } catch {
      setJoinError("网络错误，请重试");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-20">
        {/* Logo & Title */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-lg shadow-violet-500/25 mb-4">
            <Clock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            TimeBlank
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
            和朋友们找到共同的空闲时间，轻松约定见面
          </p>
        </div>

        {/* Main Actions */}
        <div className="w-full max-w-md space-y-6">
          {/* Create Room */}
          <div className="flex justify-center">
            <CreateRoomDialog />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gradient-to-br from-slate-50 via-violet-50 to-indigo-50 px-4 text-muted-foreground">
                或者
              </span>
            </div>
          </div>

          {/* Join Room */}
          <Card className="border-border/40 shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    placeholder="输入房间口令，如 ABC123"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      setJoinError("");
                    }}
                    className="h-12 text-center text-lg tracking-widest font-mono rounded-xl uppercase"
                    maxLength={6}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    variant="outline"
                    className="h-12 px-6 rounded-xl border-2 hover:bg-violet-50 hover:border-violet-300 transition-all"
                    disabled={joining || !roomCode.trim()}
                  >
                    {joining ? (
                      "加入中..."
                    ) : (
                      <>
                        加入 <ArrowRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
                {joinError && (
                  <p className="text-sm text-red-500 text-center">{joinError}</p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full px-4">
          <FeatureCard
            icon={<Users className="h-6 w-6 text-violet-500" />}
            title="创建房间"
            description="设置日期范围，生成口令分享给朋友"
          />
          <FeatureCard
            icon={<Clock className="h-6 w-6 text-indigo-500" />}
            title="选择时间"
            description="在时间网格上拖拽选择你的空闲时段"
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6 text-purple-500" />}
            title="查看结果"
            description="热力图直观展示大家都有空的时间"
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="pt-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
