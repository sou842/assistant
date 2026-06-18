import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { username } = await req.json();
    
    if (!username || typeof username !== "string") {
      return new NextResponse("Username is required", { status: 400 });
    }

    // Optional: We could verify if the user exists via leetcode graphql here
    // but for now, we just save it.

    await dbConnect();
    await User.updateOne(
      { email: session.user.email },
      { $set: { leetcodeUsername: username } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to connect LeetCode:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
