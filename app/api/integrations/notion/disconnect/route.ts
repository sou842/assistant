import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    
    await User.updateOne(
      { email: session.user.email },
      { $unset: { notionAccessToken: "" } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to disconnect Notion:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Notion" },
      { status: 500 }
    );
  }
}
