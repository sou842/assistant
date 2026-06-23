import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = "http://localhost:3000/api/integrations/notion/callback";
    
    if (!clientId) {
      return new NextResponse("Missing NOTION_CLIENT_ID", { status: 500 });
    }

    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Failed to connect Notion:", error);
    return new NextResponse("Failed to connect Notion", { status: 500 });
  }
}
