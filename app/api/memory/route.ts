import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Memory from '@/lib/models/Memory';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await dbConnect();
    const memories = await Memory.find({ userId: session.user.id }).sort({ updatedAt: -1 });
    return NextResponse.json(memories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();

    if (Array.isArray(body)) {
      // Migration mode
      const operations = body.map((memory) => ({
        updateOne: {
          filter: { _id: memory.id || memory._id, userId: session.user.id },
          update: { 
            $set: { 
              title: memory.title,
              content: memory.content,
              category: memory.category,
              source: memory.source,
              tags: memory.tags,
              enabled: memory.enabled,
              updatedAt: new Date(memory.updatedAt || Date.now()),
              createdAt: new Date(memory.createdAt || Date.now()),
              userId: session.user.id,
            } 
          },
          upsert: true,
        },
      }));

      await Memory.bulkWrite(operations);
      return NextResponse.json({ message: 'Memory migration successful' });
    } else {
      // Single memory creation
      const memory = await Memory.create({ ...body, userId: session.user.id });
      return NextResponse.json(memory);
    }
  } catch (error) {
    console.error('Failed to save memory:', error);
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { id } = await req.json();
    const memory = await Memory.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Memory deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
