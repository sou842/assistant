import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AlbumPage from '@/lib/models/AlbumPage';
import VaultItem from '@/lib/models/VaultItem';
import { auth } from '@/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string, pageId: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId, pageId } = await params;
    
    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const page = await AlbumPage.findOne({ _id: pageId, albumId });
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }
    
    return NextResponse.json({ page });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, pageId: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId, pageId } = await params;
    const body = await req.json();

    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (body.title !== undefined) {
      updateData.title = body.title;
      if (Array.isArray(album.content)) {
        const newContent = album.content.map((item: any) => 
          (typeof item === 'object' && item.pageId === pageId) 
            ? { ...item, title: body.title } 
            : item
        );
        await VaultItem.updateOne({ _id: albumId }, { $set: { content: newContent } });
      }
    }
    if (body.content !== undefined) updateData.content = body.content;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

    const updatedPage = await AlbumPage.findOneAndUpdate(
      { _id: pageId, albumId },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ page: updatedPage });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, pageId: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId, pageId } = await params;

    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const deletedPage = await AlbumPage.findOneAndDelete({ _id: pageId, albumId });
    if (!deletedPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Remove from album content array if it exists
    if (Array.isArray(album.content)) {
      const newContent = album.content.filter((item: any) => 
        typeof item === 'object' ? item.pageId !== pageId : item.toString() !== pageId
      );
      await VaultItem.updateOne(
        { _id: albumId },
        { $set: { content: newContent } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
