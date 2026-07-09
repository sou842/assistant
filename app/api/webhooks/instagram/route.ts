import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import AutomationRule from "@/lib/models/AutomationRule";
import InstagramConnection from "@/lib/models/InstagramConnection";

// Webhook Verification (Meta requires this when you first set up the webhook)
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WEBHOOK_VERIFIED");
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse("Forbidden", { status: 403 });
  }
}

// Receive Webhook Events (e.g. comments)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    // 1. Verify Signature
    if (process.env.META_CLIENT_SECRET && signature) {
      const hmac = crypto.createHmac("sha256", process.env.META_CLIENT_SECRET);
      const digest = `sha256=${hmac.update(rawBody).digest("hex")}`;
      if (signature !== digest) {
        console.error("Invalid Webhook Signature. Aborting.");
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const body = JSON.parse(rawBody);

    if (body.object === "instagram") {
      for (const entry of body.entry) {
        const instagramAccountId = entry.id;

        for (const change of entry.changes) {
          if (change.field === "comments") {
            const commentValue = change.value;
            const commentText = commentValue.text;
            const fromId = commentValue.from.id; // User who commented

            // 2. Connect to DB
            await dbConnect();

            // 3. Find the Jarvis User who owns this Instagram account
            const connection = await InstagramConnection.findOne({ instagramAccountId });
            
            if (connection) {
              // 4. Find active automation rules
              const rules = await AutomationRule.find({ 
                userId: connection.userId, 
                isActive: true 
              });

              for (const rule of rules) {
                const isMatch = rule.matchType === 'exact' 
                  ? commentText.trim().toLowerCase() === rule.triggerKeyword.toLowerCase()
                  : commentText.toLowerCase().includes(rule.triggerKeyword.toLowerCase());

                if (isMatch) {
                  console.log(`Rule Matched! Triggering DM for rule ID: ${rule._id}`);
                  
                  // 5. Send the DM using the Meta Graph API
                  await fetch(`https://graph.facebook.com/v19.0/${instagramAccountId}/messages`, {
                    method: 'POST',
                    headers: { 
                      'Authorization': `Bearer ${connection.accessToken}`, 
                      'Content-Type': 'application/json' 
                    },
                    body: JSON.stringify({
                      recipient: { id: fromId },
                      message: { text: rule.dmContent }
                    })
                  });
                }
              }
            }
          }
        }
      }
      return new NextResponse("EVENT_RECEIVED", { status: 200 });
    } else {
      return new NextResponse("Not Found", { status: 404 });
    }
  } catch (error) {
    console.error("Webhook Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
