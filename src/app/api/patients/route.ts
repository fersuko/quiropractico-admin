import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/patients
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    let patients;

    if (query) {
      patients = await db.patient.findMany({
        where: {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { phone1: { contains: query } },
            { phone2: { contains: query } },
            { genderCode: { contains: query } },
          ],
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    } else {
      patients = await db.patient.findMany({
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: 50, // Limit to recent 50 if no query to prevent loading too much
      });
    }

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
    const { id, firstName, lastName, phone1, phone2, genderCode } = body;

    if (!firstName || !lastName || !phone1) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let patient;

    if (id) {
      patient = await db.patient.update({
        where: { id },
        data: {
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          phone1,
          phone2: phone2 || null,
          genderCode: genderCode || null,
        },
      });
    } else {
      patient = await db.patient.create({
        data: {
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          phone1,
          phone2: phone2 || null,
          genderCode: genderCode || null,
        },
      });
    }

    return NextResponse.json(patient);
  } catch (error: any) {
    console.error("Error saving patient:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
