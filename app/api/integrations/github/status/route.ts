import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ connected: false });
  }

  try {
    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    return NextResponse.json({ connected: !!user?.githubAccessToken });
  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json({ connected: false });
  }
}
