import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.redirect(new URL("/ai/integrations?error=unauthorized", req.url));
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      console.error("Notion OAuth error:", error);
      return NextResponse.redirect(new URL(`/ai/integrations?error=${error}`, req.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/ai/integrations?error=no_code", req.url));
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = "http://localhost:3000/api/integrations/notion/callback";

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL("/ai/integrations?error=missing_env", req.url));
    }

    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Basic ${encoded}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Notion OAuth token error:", data);
      return NextResponse.redirect(new URL("/ai/integrations?error=token_exchange_failed", req.url));
    }

    const accessToken = data.access_token;

    await dbConnect();
    await User.updateOne(
      { email: session.user.email },
      { $set: { notionAccessToken: accessToken } }
    );

    return NextResponse.redirect(new URL("/ai/integrations", req.url));
  } catch (error) {
    console.error("Notion callback error:", error);
    return NextResponse.redirect(new URL("/ai/integrations?error=internal_error", req.url));
  }
}
