import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false, username: null });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    return NextResponse.json({ 
      connected: !!user?.leetcodeUsername,
      username: user?.leetcodeUsername || null
    });
  } catch (error) {
    console.error("Failed to check LeetCode status:", error);
    return NextResponse.json({ connected: false, username: null });
  }
}
