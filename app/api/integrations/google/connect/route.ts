import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google Client ID not configured" }, { status: 500 });
  }

  // Redirect to Google's authorization endpoint
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  const origin = req.nextUrl.origin;
  googleUrl.searchParams.set("redirect_uri", `${origin}/api/integrations/google/callback`);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "https://mail.google.com/ https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile");
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "consent");
  googleUrl.searchParams.set("state", session.user.id);

  return NextResponse.redirect(googleUrl.toString());
}
