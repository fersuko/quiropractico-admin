import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/patients
// Supports: /api/patients?q=SEARCH_TERM&status=ACTIVE&therapyId=THERAPY
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const statusFilter = searchParams.get("status") || "";
    const therapyFilter = searchParams.get("therapyId") || "";

    const whereClause: any = {};

    // 1. Text search (Name, phone, or genderCode)
    if (query) {
      whereClause.OR = [
        { firstName: { contains: query } },
        { lastName: { contains: query } },
        { phone1: { contains: query } },
        { phone2: { contains: query } },
      ];
    }

    // 2. Status filter
    if (statusFilter) {
      whereClause.status = statusFilter;
    }

    // 3. Therapy filter
    if (therapyFilter) {
      whereClause.therapyId = therapyFilter;
    }

    const patients = await db.patient.findMany({
      where: whereClause,
      include: {
        therapy: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(patients);
  } catch (error: any) {
    console.error("Error fetching patients:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/patients
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      firstName,
      lastName,
      phone1,
      phone2,
      gender,
      status,
      rx,
      therapyId,
      therapySubcategory,
      genderCode,
    } = body;

    // Validate fields as per clinical requirement
    if (!firstName || !lastName || !phone1 || !phone2 || !gender || !status || !therapyId) {
      return NextResponse.json({ error: "Faltan campos obligatorios para el registro" }, { status: 400 });
    }

    let patient;

    const dataPayload = {
      firstName: firstName.toUpperCase(),
      lastName: lastName.toUpperCase(),
      phone1,
      phone2,
      gender,
      status,
      rx: !!rx,
      therapyId,
      therapySubcategory: therapyId === "RESET" ? (therapySubcategory || "Tratamiento E") : null,
      genderCode: genderCode || null,
    };

    if (id) {
      patient = await db.patient.update({
        where: { id },
        data: dataPayload,
        include: {
          therapy: true,
        },
      });
    } else {
      patient = await db.patient.create({
        data: dataPayload,
        include: {
          therapy: true,
        },
      });
    }

    return NextResponse.json(patient);
  } catch (error: any) {
    console.error("Error saving patient:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
