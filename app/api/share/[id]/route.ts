import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VaultItem from '@/lib/models/VaultItem';
import mongoose from 'mongoose';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const { id } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const item = await VaultItem.findOne({ _id: id, isPublic: true });
    
    if (!item) {
      return NextResponse.json({ error: 'Not found or not public' }, { status: 404 });
    }
    
    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
