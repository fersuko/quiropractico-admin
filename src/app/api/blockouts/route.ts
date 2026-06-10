import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/blockouts?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Falta el parámetro de fecha" }, { status: 400 });
    }

    const blocks = await db.scheduleBlock.findMany({
      where: { date },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(blocks);
  } catch (error: any) {
    console.error("Error fetching blockouts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/blockouts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, type, halfDayType, timeSlot, consultorio, reason } = body;

    if (!date || !type || !consultorio) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    // Validation
    if (type === "15_MIN" || type === "HOUR") {
      if (!timeSlot) {
        return NextResponse.json({ error: "Se requiere un bloque de tiempo de inicio" }, { status: 400 });
      }
    }

    const block = await db.scheduleBlock.create({
      data: {
        date,
        type,
        timeSlot: timeSlot || null,
        halfDayType: halfDayType || null,
        consultorio,
        reason: reason || null,
      },
    });

    return NextResponse.json(block);
  } catch (error: any) {
    console.error("Error creating blockout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/blockouts?id=UUID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta ID de bloqueo" }, { status: 400 });
    }

    const deleted = await db.scheduleBlock.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error: any) {
    console.error("Error deleting blockout:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
