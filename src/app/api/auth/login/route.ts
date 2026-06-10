import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: "Faltan usuario y/o contraseña" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user || user.password !== hashPassword(password)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }

    // Return user details (without password hash)
    return NextResponse.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  } catch (error: any) {
    console.error("Error in login API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
