import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
    const body = await request.json();
    const { id, name, description, price, color } = body;

    if (!id || !name || price === undefined || !color) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
