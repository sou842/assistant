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
    return NextResponse.redirect(new URL("/ai/integrations?error=no_code", req.url));
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.AUTH_GITHUB_ID,
        client_secret: process.env.AUTH_GITHUB_SECRET,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    
    if (tokenData.error) {
      console.error("GitHub token error:", tokenData);
      return NextResponse.redirect(new URL("/ai/integrations?error=oauth_failed", req.url));
    }

    const accessToken = tokenData.access_token;

    // Save token to user document
    await dbConnect();
    await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        $set: { githubAccessToken: accessToken },
        $setOnInsert: { name: session.user.name || session.user.email || "User" }
      },
      { upsert: true, new: true }
    );

    return NextResponse.redirect(new URL("/ai/integrations?success=true", req.url));
  } catch (error) {
    console.error("Integration error:", error);
    return NextResponse.redirect(new URL("/ai/integrations?error=server_error", req.url));
  }
}
