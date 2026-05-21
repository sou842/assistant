import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VaultItem from '@/lib/models/VaultItem';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const filter: any = {};
    if (type) filter.type = type;
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    const items = await VaultItem.find(filter).sort({ updatedAt: -1 });
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const item = await VaultItem.create(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
