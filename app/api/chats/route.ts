import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';

export async function GET() {
  try {
    await dbConnect();
    const chats = await Chat.find({})
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
    await dbConnect();
    const body = await req.json();

    // Support for single chat creation or bulk sync (migration)
    if (Array.isArray(body)) {
      // Migration mode
      const operations = body.map((chat) => ({
        updateOne: {
          filter: { _id: chat.id || chat._id },
          update: { 
            $set: { 
              title: chat.title, 
              messages: chat.messages,
              updatedAt: new Date(chat.updatedAt || Date.now()),
              createdAt: new Date(chat.createdAt || Date.now()),
            } 
          },
          upsert: true,
        },
      }));

      await Chat.bulkWrite(operations);
      return NextResponse.json({ message: 'Migration successful' });
    } else {
      // Single chat creation
      const { title, messages } = body;
      const chat = await Chat.create({ title, messages });
      return NextResponse.json(chat);
    }
  } catch (error) {
    console.error('Failed to save chat(s):', error);
    return NextResponse.json({ error: 'Failed to save chat(s)' }, { status: 500 });
  }
}
