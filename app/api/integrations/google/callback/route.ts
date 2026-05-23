import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/ai/integrations?google=error&reason=no_code", req.url));
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/integrations/google/callback`,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Google token error:", tokenData);
      return NextResponse.redirect(new URL("/ai/integrations?google=error&reason=oauth_failed", req.url));
    }

    const refreshToken = tokenData.refresh_token;

    if (refreshToken) {
      // Save token to user document
      await dbConnect();
      await User.findOneAndUpdate(
        { email: session.user.email },
        {
          $set: { googleRefreshToken: refreshToken },
          $setOnInsert: { name: session.user.name || session.user.email || "User" }
        },
        { upsert: true, new: true }
      );
      return NextResponse.redirect(new URL("/ai/integrations?google=success", req.url));
    } else {
      console.warn("No refresh token received from Google. Response:", JSON.stringify(tokenData));
      // Fallback: If we got an access token but no refresh token, maybe we can still save something?
      // Actually, without a refresh token, we can't persist offline access. We must throw an error.
      return NextResponse.redirect(new URL("/ai/integrations?google=error&reason=no_refresh_token", req.url));
    }
  } catch (error) {
    console.error("Integration error:", error);
    return NextResponse.redirect(new URL("/ai/integrations?google=error&reason=server_error", req.url));
  }
}
