import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VaultItem from '@/lib/models/VaultItem';
import AlbumPage from '@/lib/models/AlbumPage';
import { auth } from '@/auth';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const filter: any = { userId: session.user.id };
    if (type) filter.type = type;
    if (search) {
      filter.title = { $regex: search, $options: 'i' };
    }

    let query = VaultItem.find(filter).sort({ createdAt: -1 });
    if (type !== 'gallery') {
      query = query.select('-content');
    }
    const items = await query;
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    body.userId = session.user.id;
    
    const item = await VaultItem.create(body);

    if (body.type === 'album') {
      const defaultPage = await AlbumPage.create({
        albumId: item._id,
        title: 'Page 1',
        content: {},
        order: 0
      });
      
      item.content = [{ pageId: defaultPage._id.toString(), title: defaultPage.title }];
      await item.save();
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
