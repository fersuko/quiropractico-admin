import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

// GET /api/config
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "get";

    if (action === "get") {
      const config = await db.appConfig.upsert({
        where: { id: "default" },
        update: {},
        create: {
          whatsappTemplate: "Hola *{paciente}*, te recordamos tu cita de *{terapia}* el día *{fecha}* a las *{hora}*. Por favor confírmanos por este medio.",
        },
      });
      return NextResponse.json(config);
    }

    if (action === "backup") {
      // Get the database path
      // In SQLite, it typically points to file:./dev.db or process.env.DATABASE_URL
      const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
      let filePath = "";

      if (dbUrl.startsWith("file:")) {
        filePath = dbUrl.substring(5); // Remove "file:"
      } else {
        filePath = dbUrl;
      }

      // Resolve relative path if needed
      const absolutePath = path.resolve(filePath);

      if (!fs.existsSync(absolutePath)) {
        return NextResponse.json({ error: "Database file not found" }, { status: 404 });
      }

      const fileBuffer = fs.readFileSync(absolutePath);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/vnd.sqlite3",
          "Content-Disposition": `attachment; filename="backup_quiropractico_${new Date().toISOString().split("T")[0]}.db"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/config
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { whatsappTemplate } = body;

    if (!whatsappTemplate) {
      return NextResponse.json({ error: "whatsappTemplate is required" }, { status: 400 });
    }

    const config = await db.appConfig.upsert({
      where: { id: "default" },
      update: { whatsappTemplate },
      create: { id: "default", whatsappTemplate },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error updating config:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
