import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  syncAppointmentToGoogleCalendar,
  deleteAppointmentFromGoogleCalendar,
} from "@/lib/googleCalendar";

// GET /api/appointments?date=YYYY-MM-DD
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Missing date parameter" }, { status: 400 });
    }

    const appointments = await db.appointment.findMany({
      where: { date },
      include: {
        patient: true,
        therapy: true,
      },
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/appointments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId,
      therapyId,
      date,
      timeSlot,
      bedNumber,
      status,
      paymentStatus,
      tipo,
      rx,
      notes,
    } = body;

    if (!patientId || !therapyId || !date || !timeSlot || bedNumber === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check double booking
    const existing = await db.appointment.findUnique({
      where: {
        date_timeSlot_bedNumber: {
          date,
          timeSlot,
          bedNumber: parseInt(bedNumber),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `La cama ${bedNumber} ya está ocupada en el horario de las ${timeSlot}.` },
        { status: 409 }
      );
    }

    // 2. Create appointment
    const appointment = await db.appointment.create({
      data: {
        patientId,
        therapyId,
        date,
        timeSlot,
        bedNumber: parseInt(bedNumber),
        status: status || "Agendada",
        paymentStatus: paymentStatus || "Pendiente",
        tipo: tipo || "COT",
        rx: !!rx,
        notes: notes || null,
      },
    });

    // 3. Trigger Google Calendar sync (non-blocking)
    syncAppointmentToGoogleCalendar(appointment.id).catch((err) =>
      console.error("Async Google Calendar sync failed:", err)
    );

    return NextResponse.json(appointment);
  } catch (error: any) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/appointments
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      patientId,
      therapyId,
      date,
      timeSlot,
      bedNumber,
      status,
      paymentStatus,
      tipo,
      rx,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 });
    }

    // If changing slot/bed, check double booking
    if (date && timeSlot && bedNumber !== undefined) {
      const existing = await db.appointment.findUnique({
        where: {
          date_timeSlot_bedNumber: {
            date,
            timeSlot,
            bedNumber: parseInt(bedNumber),
          },
        },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: `La cama ${bedNumber} ya está ocupada en el horario de las ${timeSlot}.` },
          { status: 409 }
        );
      }
    }

    // Update appointment
    const updated = await db.appointment.update({
      where: { id },
      data: {
        patientId,
        therapyId,
        date,
        timeSlot,
        bedNumber: bedNumber !== undefined ? parseInt(bedNumber) : undefined,
        status,
        paymentStatus,
        tipo,
        rx: rx !== undefined ? !!rx : undefined,
        notes,
      },
    });

    // Trigger Google Calendar sync (non-blocking)
    syncAppointmentToGoogleCalendar(updated.id).catch((err) =>
      console.error("Async Google Calendar sync failed on update:", err)
    );

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/appointments?id=XXXX
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 });
    }

    // 1. Delete from Google Calendar first (requires appointment data from db)
    await deleteAppointmentFromGoogleCalendar(id);

    // 2. Delete from database
    const deleted = await db.appointment.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error: any) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
