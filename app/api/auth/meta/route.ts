import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import InstagramConnection from "@/lib/models/InstagramConnection";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const clientId = process.env.META_CLIENT_ID;
  const clientSecret = process.env.META_CLIENT_SECRET;
  const redirectUri = `${req.nextUrl.origin}/api/auth/meta`;

  if (code) {
    // 1. Verify State matches user ID to prevent CSRF
    if (state !== session.user.id) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 403 });
    }

    try {
      // 2. Exchange code for short-lived access token
      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
      const tokenData = await tokenRes.json();
      
      if (tokenData.error) throw new Error(tokenData.error.message);
      
      const shortLivedToken = tokenData.access_token;

      // 3. Exchange short-lived token for long-lived token
      const longLivedRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`);
      const longLivedData = await longLivedRes.json();

      if (longLivedData.error) throw new Error(longLivedData.error.message);

      const longLivedToken = longLivedData.access_token;

      // 4. Get User's Pages (to find the Instagram Business Account)
      const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedToken}`);
      const pagesData = await pagesRes.json();
      
      if (!pagesData.data || pagesData.data.length === 0) {
         throw new Error("No Facebook Pages found. You must connect an Instagram Professional account to a Facebook Page.");
      }

      // 5. Get the Instagram Account ID from the first connected Page
      const pageId = pagesData.data[0].id;
      const igAccountRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${longLivedToken}`);
      const igAccountData = await igAccountRes.json();

      if (!igAccountData.instagram_business_account) {
         throw new Error("No Instagram Professional Account connected to this Facebook Page.");
      }

      const instagramAccountId = igAccountData.instagram_business_account.id;

      // 6. Save to Database
      await dbConnect();
      await InstagramConnection.findOneAndUpdate(
        { userId: session.user.id },
        { 
          instagramAccountId,
          pageId,
          accessToken: longLivedToken,
          expiresAt: new Date(Date.now() + (longLivedData.expires_in * 1000) || 5184000000) // ~60 days default
        },
        { upsert: true, new: true }
      );

      // Redirect the user back to the automation page
      return NextResponse.redirect(new URL("/ai/automation?status=connected", req.url));
    } catch (error: any) {
      console.error("Meta OAuth Error:", error);
      return NextResponse.redirect(new URL(`/ai/automation?error=${encodeURIComponent(error.message)}`, req.url));
    }
  }

  // Initial redirect to Meta
  if (!clientId) {
    return NextResponse.json({ error: "META_CLIENT_ID not configured in environment" }, { status: 500 });
  }

  const metaOauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${session.user.id}&scope=instagram_basic,instagram_manage_comments,instagram_manage_messages,pages_show_list,pages_messaging`;
  
  return NextResponse.redirect(metaOauthUrl);
}
