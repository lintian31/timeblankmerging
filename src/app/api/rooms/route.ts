import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/db";

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, dateStart, dateEnd, timeStart, timeEnd } = body;

    if (!name || !dateStart || !dateEnd) {
      return NextResponse.json(
        { error: "房间名称和日期范围不能为空" },
        { status: 400 }
      );
    }

    const room = createRoom(
      name,
      dateStart,
      dateEnd,
      timeStart || "09:00",
      timeEnd || "22:00"
    );

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Create room error:", error);
    return NextResponse.json(
      { error: "创建房间失败" },
      { status: 500 }
    );
  }
}
