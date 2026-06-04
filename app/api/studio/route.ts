import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import StudioDocument from '@/lib/models/StudioDocument';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    const filter: any = { userId: session.user.id };

    if (search) {
      filter.$text = { $search: search };
    }

    const items = await StudioDocument.find(filter)
      .sort({ updatedAt: -1 })
      .limit(50);

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const data = await req.json();

    const item = await StudioDocument.create({
      ...data,
      userId: session.user.id,
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
