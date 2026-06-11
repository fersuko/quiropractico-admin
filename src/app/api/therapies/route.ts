import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to check admin permission
function checkAdminPermission(request: Request): boolean {
  const role = request.headers.get("x-user-role");
  return role === "Admin";
}

// GET /api/therapies
export async function GET() {
  try {
    const therapies = await db.therapy.findMany({
      orderBy: { price: "desc" },
    });
    return NextResponse.json(therapies);
  } catch (error: any) {
    console.error("Error fetching therapies:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/therapies
export async function POST(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, price, color } = body;

    if (!id || !name || price === undefined || !color) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const therapy = await db.therapy.upsert({
      where: { id },
      update: { name, description, price: parseFloat(price), color },
      create: { id, name, description, price: parseFloat(price), color },
    });

    return NextResponse.json(therapy);
  } catch (error: any) {
    console.error("Error saving therapy:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/therapies?id=THERAPY_ID
export async function DELETE(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta ID de la terapia" }, { status: 400 });
    }

    // Check if any appointment is using this therapy
    const apptCount = await db.appointment.count({
      where: { therapyId: id },
    });
    if (apptCount > 0) {
      return NextResponse.json({ error: "No se puede eliminar la terapia porque está asociada a una o más citas." }, { status: 400 });
    }

    // Check if any patient is using this therapy
    const patientCount = await db.patient.count({
      where: { therapyId: id },
    });
    if (patientCount > 0) {
      return NextResponse.json({ error: "No se puede eliminar la terapia porque está asignada a uno o más pacientes como su terapia inicial." }, { status: 400 });
    }

    const deleted = await db.therapy.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: deleted.id });
  } catch (error: any) {
    console.error("Error deleting therapy:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

