import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  syncAppointmentToGoogleCalendar,
  deleteAppointmentFromGoogleCalendar,
} from "@/lib/googleCalendar";

// Helper to check scheduling permission (Admin or Reception)
function checkSchedulingPermission(request: Request): boolean {
  const role = request.headers.get("x-user-role");
  return role === "Admin" || role === "Recepción";
}

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
        user: {
          select: {
            name: true,
            role: true,
          },
        },
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
    // Check permission
    if (!checkSchedulingPermission(request)) {
      return NextResponse.json({ error: "No tienes permiso para agendar citas." }, { status: 403 });
    }

    const body = await request.json();
    const {
      patientId,
      therapyId,
      therapySubcategory,
      date,
      timeSlot,
      consultorio,
      status,
      paymentStatus,
      tipo,
      rx,
      notes,
      userId, // The user scheduling/attending the appointment
    } = body;

    if (!patientId || !therapyId || !date || !timeSlot || !consultorio) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Check double booking of the office (consultorio) in the slot
    const existing = await db.appointment.findUnique({
      where: {
        date_timeSlot_consultorio: {
          date,
          timeSlot,
          consultorio,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `El Consultorio ${consultorio} ya está ocupado en el horario de las ${timeSlot}.` },
        { status: 409 }
      );
    }

    // 2. Create appointment
    const appointment = await db.appointment.create({
      data: {
        patientId,
        therapyId,
        therapySubcategory: therapyId === "RESET" ? (therapySubcategory || "Tratamiento E") : null,
        date,
        timeSlot,
        consultorio,
        status: status || "Agendada",
        paymentStatus: paymentStatus || "Pendiente",
        tipo: tipo || "COT",
        rx: !!rx,
        notes: notes || null,
        userId: userId || null,
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
      therapySubcategory,
      date,
      timeSlot,
      consultorio,
      status,
      paymentStatus,
      tipo,
      rx,
      notes,
      userId,
    } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 });
    }

    // Fetch existing appointment to check creator and roles
    const existingAppointment = await db.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const requesterRole = request.headers.get("x-user-role");

    // Doctors can only update notes, rx status, or appointment status, they cannot reschedule (change date, slot, or office)
    if (requesterRole === "Doctor") {
      const isRescheduling = 
        (date && date !== existingAppointment.date) || 
        (timeSlot && timeSlot !== existingAppointment.timeSlot) || 
        (consultorio && consultorio !== existingAppointment.consultorio) ||
        (patientId && patientId !== existingAppointment.patientId);

      if (isRescheduling) {
        return NextResponse.json({ error: "Los doctores no pueden reagendar citas. Solicítelo a Recepción." }, { status: 403 });
      }
    } else if (requesterRole !== "Admin" && requesterRole !== "Recepción") {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    // If rescheduling, check double booking
    if (date && timeSlot && consultorio) {
      const existing = await db.appointment.findUnique({
        where: {
          date_timeSlot_consultorio: {
            date,
            timeSlot,
            consultorio,
          },
        },
      });

      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: `El Consultorio ${consultorio} ya está ocupado en el horario de las ${timeSlot}.` },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      patientId,
      therapyId,
      date,
      timeSlot,
      consultorio,
      status,
      paymentStatus,
      tipo,
      rx: rx !== undefined ? !!rx : undefined,
      notes,
      userId,
    };

    if (therapyId) {
      updateData.therapySubcategory = therapyId === "RESET" ? (therapySubcategory || "Tratamiento E") : null;
    }

    // Update appointment
    const updated = await db.appointment.update({
      where: { id },
      data: updateData,
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
    // Check permission
    if (!checkSchedulingPermission(request)) {
      return NextResponse.json({ error: "No tienes permiso para eliminar citas." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing appointment ID" }, { status: 400 });
    }

    // 1. Delete from Google Calendar first
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
