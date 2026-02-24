import { NextRequest, NextResponse } from "next/server";
import {
  getRoomByCode,
  getParticipantsByRoom,
  getTimeSlotsByRoom,
  getParticipantByRoomAndName,
  addParticipant,
} from "@/lib/db";

// GET /api/rooms/[code] - Get room details with participants and time slots
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const room = getRoomByCode(code.toUpperCase());

    if (!room) {
      return NextResponse.json(
        { error: "房间不存在" },
        { status: 404 }
      );
    }

    const participants = getParticipantsByRoom(room.id);
    const timeSlots = getTimeSlotsByRoom(room.id);

    return NextResponse.json({
      room,
      participants,
      timeSlots,
    });
  } catch (error) {
    console.error("Get room error:", error);
    return NextResponse.json(
      { error: "获取房间信息失败" },
      { status: 500 }
    );
  }
}

// POST /api/rooms/[code] - Join a room (add participant)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: "请输入你的昵称" },
        { status: 400 }
      );
    }

    const room = getRoomByCode(code.toUpperCase());
    if (!room) {
      return NextResponse.json(
        { error: "房间不存在" },
        { status: 404 }
      );
    }

    // Check if participant already exists
    let participant = getParticipantByRoomAndName(room.id, name);
    if (!participant) {
      participant = addParticipant(room.id, name);
    }

    return NextResponse.json({ participant });
  } catch (error) {
    console.error("Join room error:", error);
    return NextResponse.json(
      { error: "加入房间失败" },
      { status: 500 }
    );
  }
}
