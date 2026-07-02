import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import AlbumPage from '@/lib/models/AlbumPage';
import VaultItem from '@/lib/models/VaultItem';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: albumId } = await params;
    const body = await req.json();

    // Body should contain { pages: any[] } representing the new order
    if (!body.pages || !Array.isArray(body.pages)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Ensure the album belongs to the user
    const album = await VaultItem.findOne({ _id: albumId, userId: session.user.id });
    if (!album) {
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    // Update the album's content array
    await VaultItem.updateOne(
      { _id: albumId },
      { $set: { content: body.pages } }
    );

    // Optionally update the 'order' field on each AlbumPage for redundancy/easier querying
    const bulkOps = body.pages.map((pageObj: any, index: number) => {
      const pId = typeof pageObj === 'string' ? pageObj : pageObj.pageId;
      return {
        updateOne: {
          filter: { _id: pId, albumId },
          update: { $set: { order: index } }
        }
      };
    });

    if (bulkOps.length > 0) {
      await AlbumPage.bulkWrite(bulkOps);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
