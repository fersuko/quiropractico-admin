import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function checkAdminPermission(request: Request): boolean {
  const role = request.headers.get("x-user-role");
  return role === "Admin";
}

// GET /api/users
export async function GET(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users
export async function POST(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { username, password, name, role } = body;

    if (!username || !password || !name || !role) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const existing = await db.user.findUnique({
      where: { username },
    });

    if (existing) {
      return NextResponse.json({ error: "El nombre de usuario ya está registrado" }, { status: 409 });
    }

    const user = await db.user.create({
      data: {
        username,
        password: hashPassword(password),
        name,
        role,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/users
export async function PUT(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const body = await request.json();
    const { id, username, password, name, role } = body;

    if (!id || !username || !name || !role) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    // Check if username taken by another user
    const existing = await db.user.findUnique({
      where: { username },
    });

    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "El nombre de usuario ya está en uso" }, { status: 409 });
    }

    const updateData: any = {
      username,
      name,
      role,
    };

    if (password && password.trim() !== "") {
      updateData.password = hashPassword(password);
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/users
export async function DELETE(request: Request) {
  try {
    if (!checkAdminPermission(request)) {
      return NextResponse.json({ error: "Acceso no autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta ID de usuario" }, { status: 400 });
    }

    // Don't let an admin delete themselves (if we can verify by username)
    // For simplicity, we just delete
    const deleted = await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: deleted.username });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
