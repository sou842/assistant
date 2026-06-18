import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKey } = await req.json();
    if (!apiKey) {
      return NextResponse.json({ error: 'Dev.to API key is required' }, { status: 400 });
    }

    await dbConnect();
    console.log("Updating Dev.to for user:", session.user.email, "with key:", apiKey);
    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { devtoApiKey: apiKey },
      { new: true, upsert: true }
    );
    console.log("Updated user in DB:", user?.email, "devtoApiKey:", !!user?.devtoApiKey);

    return NextResponse.json({ success: true, message: 'Dev.to connected successfully' });
  } catch (error: any) {
    console.error('Dev.to Connect Error:', error);
    return NextResponse.json({ error: 'Failed to connect Dev.to' }, { status: 500 });
  }
}
