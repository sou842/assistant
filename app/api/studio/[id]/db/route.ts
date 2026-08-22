import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import StudioDocument from '@/lib/models/StudioDocument';

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const item = await StudioDocument.findOne({ _id: id, userId: session.user.id });

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ db: item.db || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { key, value, data } = body;

    let updateObj: any = {};
    if (key !== undefined) {
      updateObj = { $set: { [`db.${key}`]: value } };
    } else if (data !== undefined) {
      updateObj = { $set: { db: data } };
    } else {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const item = await StudioDocument.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      updateObj,
      { new: true }
    );

    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ db: item.db || {} });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
