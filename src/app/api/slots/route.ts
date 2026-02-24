import { NextRequest, NextResponse } from "next/server";
import { saveTimeSlots, getTimeSlotsByRoom, getRoomByCode } from "@/lib/db";

// POST /api/slots - Save time slots for a participant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { participantId, roomCode, slots } = body;

    if (!participantId || !roomCode) {
      return NextResponse.json(
        { error: "参数不完整" },
        { status: 400 }
      );
    }

    const room = getRoomByCode(roomCode.toUpperCase());
    if (!room) {
      return NextResponse.json(
        { error: "房间不存在" },
        { status: 404 }
      );
    }

    // slots is an array of { date: string, time_slot: string }
    saveTimeSlots(participantId, room.id, slots || []);

    // Return updated time slots for the room
    const allSlots = getTimeSlotsByRoom(room.id);

    return NextResponse.json({ timeSlots: allSlots });
  } catch (error) {
    console.error("Save slots error:", error);
    return NextResponse.json(
      { error: "保存时间失败" },
      { status: 500 }
    );
  }
}
