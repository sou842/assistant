import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Workflow from '@/lib/models/Workflow';
import { auth } from '@/auth';

export async function GET() {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const workflows = await Workflow.find({ userId: session.user.id }).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    body.userId = session.user.id;
    const workflow = await Workflow.create(body);
    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
