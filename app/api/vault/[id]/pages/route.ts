import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AlbumPage from '@/lib/models/AlbumPage';
import VaultItem from '@/lib/models/VaultItem';
import { auth } from '@/auth';
import mongoose from 'mongoose';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId } = await params;
    
    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const pages = await AlbumPage.find({ albumId }).sort({ order: 1, createdAt: 1 });
    
    return NextResponse.json({ pages });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId } = await params;
    const body = await req.json();

    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Get the highest order number to append to the end
    const lastPage = await AlbumPage.findOne({ albumId }).sort({ order: -1 });
    const nextOrder = lastPage ? lastPage.order + 1 : 0;

    const newPage = await AlbumPage.create({
      albumId: album._id,
      title: body.title || 'Untitled Page',
      content: body.content || {},
      order: nextOrder
    });

    // We can also store the page reference in the album content if needed
    // Assuming album.content is an array of ObjectIds or we initialize it
    let currentContent = album.content;
    if (!Array.isArray(currentContent)) {
      currentContent = [];
    }
    
    currentContent.push({ pageId: newPage._id.toString(), title: newPage.title });
    
    await VaultItem.updateOne(
      { _id: albumId },
      { $set: { content: currentContent } }
    );

    return NextResponse.json({ page: newPage }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
