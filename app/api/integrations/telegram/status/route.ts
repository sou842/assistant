import { NextResponse } from "next/server";
import { auth } from "@/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });

    return NextResponse.json({
      isConnected: !!user?.telegramChatId,
      chatId: user?.telegramChatId || null,
    });
  } catch (error) {
    console.error("Failed to check Telegram status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
