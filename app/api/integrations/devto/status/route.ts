import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ connected: false });
    }

    await dbConnect();
    const user = await User.findOne({ email: session.user.email });
    console.log("Checking Dev.to status for:", session.user.email, "devtoApiKey:", !!user?.devtoApiKey);

    return NextResponse.json({ connected: !!user?.devtoApiKey });
  } catch (error: any) {
    console.error('Dev.to Status Error:', error);
    return NextResponse.json({ connected: false });
  }
}
