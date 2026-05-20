import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGoogleOAuthClient, getGoogleAuthToken } from "@/lib/googleCalendar";

// GET /api/google-auth
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    if (action === "status") {
      const authData = await getGoogleAuthToken();
      const isAuthorized = !!(authData && authData.refreshToken);
      return NextResponse.json({
        isAuthorized,
        updatedAt: authData?.updatedAt || null,
      });
    }

    if (action === "auth-url") {
      const oauth2Client = getGoogleOAuthClient();
      const scopes = ["https://www.googleapis.com/auth/calendar"];
      
      const url = oauth2Client.generateAuthUrl({
        access_type: "offline", // Essential to get the Refresh Token
        scope: scopes,
        prompt: "consent", // Force consent screen to always get a new Refresh Token
      });

      return NextResponse.json({ url });
    }

    if (action === "disconnect") {
      await db.googleAuth.upsert({
        where: { id: "default" },
        update: {
          accessToken: null,
          refreshToken: null,
          expiryDate: null,
        },
        create: {
          id: "default",
          accessToken: null,
          refreshToken: null,
          expiryDate: null,
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/google-auth:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
