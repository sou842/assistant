import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VaultItem from '@/lib/models/VaultItem';
import AlbumPage from '@/lib/models/AlbumPage';
import mongoose from 'mongoose';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string, pageId: string }> }
) {
  try {
    await dbConnect();
    const { id, pageId } = await params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id) || !pageId || !mongoose.Types.ObjectId.isValid(pageId)) {
      return NextResponse.json({ error: 'Valid IDs are required' }, { status: 400 });
    }

    const item = await VaultItem.findOne({ _id: id, isPublic: true });
    
    if (!item) {
      return NextResponse.json({ error: 'Not found or not public' }, { status: 404 });
    }

    const page = await AlbumPage.findOne({ _id: pageId, albumId: item._id });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json({ page });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
