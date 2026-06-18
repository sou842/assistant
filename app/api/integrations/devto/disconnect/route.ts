import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    await User.findOneAndUpdate(
      { email: session.user.email },
      { $unset: { devtoApiKey: 1 } }
    );

    return NextResponse.json({ success: true, message: 'Dev.to disconnected successfully' });
  } catch (error: any) {
    console.error('Dev.to Disconnect Error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Dev.to' }, { status: 500 });
  }
}
