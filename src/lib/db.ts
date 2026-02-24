import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "timeblank.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      time_start TEXT NOT NULL DEFAULT '09:00',
      time_end TEXT NOT NULL DEFAULT '22:00',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS time_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
    CREATE INDEX IF NOT EXISTS idx_participants_room ON participants(room_id);
    CREATE INDEX IF NOT EXISTS idx_time_slots_room ON time_slots(room_id);
    CREATE INDEX IF NOT EXISTS idx_time_slots_participant ON time_slots(participant_id);
  `);
}

// Generate a random room code (6 chars, uppercase + digits)
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // exclude confusing chars
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Room operations
export interface Room {
  id: number;
  code: string;
  name: string;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  created_at: string;
}

export interface Participant {
  id: number;
  room_id: number;
  name: string;
  created_at: string;
}

export interface TimeSlot {
  id: number;
  participant_id: number;
  room_id: number;
  date: string;
  time_slot: string;
}

export function createRoom(
  name: string,
  dateStart: string,
  dateEnd: string,
  timeStart: string,
  timeEnd: string
): Room {
  const db = getDb();
  let code = generateRoomCode();

  // Ensure uniqueness
  while (db.prepare("SELECT id FROM rooms WHERE code = ?").get(code)) {
    code = generateRoomCode();
  }

  const stmt = db.prepare(
    "INSERT INTO rooms (code, name, date_start, date_end, time_start, time_end) VALUES (?, ?, ?, ?, ?, ?)"
  );
  stmt.run(code, name, dateStart, dateEnd, timeStart, timeEnd);

  return db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as Room;
}

export function getRoomByCode(code: string): Room | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM rooms WHERE code = ?").get(code) as
    | Room
    | undefined;
}

export function addParticipant(roomId: number, name: string): Participant {
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO participants (room_id, name) VALUES (?, ?)"
  );
  const result = stmt.run(roomId, name);
  return db
    .prepare("SELECT * FROM participants WHERE id = ?")
    .get(result.lastInsertRowid) as Participant;
}

export function getParticipantsByRoom(roomId: number): Participant[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM participants WHERE room_id = ? ORDER BY created_at")
    .all(roomId) as Participant[];
}

export function getParticipantByRoomAndName(
  roomId: number,
  name: string
): Participant | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM participants WHERE room_id = ? AND name = ?")
    .get(roomId, name) as Participant | undefined;
}

export function saveTimeSlots(
  participantId: number,
  roomId: number,
  slots: { date: string; time_slot: string }[]
): void {
  const db = getDb();
  const deleteStmt = db.prepare(
    "DELETE FROM time_slots WHERE participant_id = ? AND room_id = ?"
  );
  const insertStmt = db.prepare(
    "INSERT INTO time_slots (participant_id, room_id, date, time_slot) VALUES (?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    deleteStmt.run(participantId, roomId);
    for (const slot of slots) {
      insertStmt.run(participantId, roomId, slot.date, slot.time_slot);
    }
  });

  transaction();
}

export function getTimeSlotsByRoom(roomId: number): TimeSlot[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM time_slots WHERE room_id = ?")
    .all(roomId) as TimeSlot[];
}

export function getTimeSlotsByParticipant(participantId: number): TimeSlot[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM time_slots WHERE participant_id = ?")
    .all(participantId) as TimeSlot[];
}
