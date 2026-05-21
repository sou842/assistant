import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const chats = await Chat.find({ userId: session.user.id })
      .select('title updatedAt createdAt')
      .sort({ updatedAt: -1 });
    
    return NextResponse.json(chats);
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
            } 
          },
          upsert: true,
        },
      }));

      await Chat.bulkWrite(operations);
      return NextResponse.json({ message: 'Migration successful' });
    } else {
      const { title, messages } = body;
      const chat = await Chat.create({ title, messages, userId: session.user.id });
      return NextResponse.json(chat);
    }
  } catch (error) {
    console.error('Failed to save chat(s):', error);
    return NextResponse.json({ error: 'Failed to save chat(s)' }, { status: 500 });
  }
}
