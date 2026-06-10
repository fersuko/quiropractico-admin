import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/patients/[id]/history
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Falta ID del paciente" }, { status: 400 });
    }

    const patient = await db.patient.findUnique({
      where: { id },
      include: {
        therapy: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    // Fetch clinical history notes
    const records = await db.clinicalRecord.findMany({
      where: { patientId: id },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Fetch all patient appointments (even cancelled ones for complete history)
    const appointments = await db.appointment.findMany({
      where: { patientId: id },
      include: {
        therapy: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { date: "desc" },
        { timeSlot: "desc" },
      ],
    });

    return NextResponse.json({
      patient,
      records,
      appointments,
    });
  } catch (error: any) {
    console.error("Error fetching patient history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/patients/[id]/history
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { notes, userId, date } = body;

    if (!id) {
      return NextResponse.json({ error: "Falta ID del paciente" }, { status: 400 });
    }
    if (!notes || !userId) {
      return NextResponse.json({ error: "Faltan campos obligatorios (notas, usuario)" }, { status: 400 });
    }

    const todayStr = date || new Date().toISOString().split("T")[0];

    const record = await db.clinicalRecord.create({
      data: {
        patientId: id,
        userId,
        date: todayStr,
        notes,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error("Error creating clinical record:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
