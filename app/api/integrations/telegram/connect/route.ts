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

    const { chatId } = await req.json();
    
    if (!chatId || typeof chatId !== "string") {
      return new NextResponse("Chat ID is required", { status: 400 });
    }

    await dbConnect();
    await User.updateOne(
      { email: session.user.email },
      { $set: { telegramChatId: chatId } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to connect Telegram:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
