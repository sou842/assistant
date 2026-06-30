import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import { auth } from '@/auth';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const page = url.searchParams.get('page');
    const limit = url.searchParams.get('limit');
    const search = url.searchParams.get('search');

    await dbConnect();
    
    let query: any = { userId: session.user.id };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const [chats, totalCount] = await Promise.all([
        Chat.find(query)
          .select('title updatedAt createdAt isPinned')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Chat.countDocuments(query)
      ]);

      const totalPages = Math.ceil(totalCount / limitNum) || 1;
      return NextResponse.json({ chats, totalPages, totalCount });
    } else {
      const chats = await Chat.find(query)
        .select('title updatedAt createdAt isPinned')
        .sort({ updatedAt: -1 });
      
      return NextResponse.json(chats);
    }
  } catch (error) {
    console.error('Failed to fetch chats:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (Array.isArray(body)) {
      const operations = body.map((chat) => ({
        updateOne: {
          filter: { _id: chat.id || chat._id, userId: session.user.id },
          update: { 
            $set: { 
              title: chat.title, 
              messages: chat.messages,
              updatedAt: new Date(chat.updatedAt || Date.now()),
              createdAt: new Date(chat.createdAt || Date.now()),
              userId: session.user.id,
              isPinned: chat.isPinned,
            } 
          },
          upsert: true,
        },
      }));

      await Chat.bulkWrite(operations);
      return NextResponse.json({ message: 'Migration successful' });
    } else {
      const { title, messages, isPinned } = body;
      const chat = await Chat.create({ title, messages, userId: session.user.id, isPinned });
      return NextResponse.json(chat);
    }
  } catch (error) {
    console.error('Failed to save chat(s):', error);
    return NextResponse.json({ error: 'Failed to save chat(s)' }, { status: 500 });
  }
}
