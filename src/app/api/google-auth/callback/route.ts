import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getGoogleOAuthClient } from "@/lib/googleCalendar";

// GET /api/google-auth/callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/settings?error=no_code", request.url));
    }

    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      console.warn("No refresh token returned. Re-authorization might be needed.");
    }

    const updateData: any = {};
    if (tokens.access_token) updateData.accessToken = tokens.access_token;
    if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
    if (tokens.expiry_date) updateData.expiryDate = String(tokens.expiry_date);

    await db.googleAuth.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        ...updateData,
      },
    });

    // Redirect the user to the settings page in our frontend
    return NextResponse.redirect(new URL("/settings?googleConnected=true", request.url));
  } catch (error) {
    console.error("Error exchanging OAuth code:", error);
    return NextResponse.redirect(new URL("/settings?error=exchange_failed", request.url));
  }
}
