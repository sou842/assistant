import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Memory from '@/lib/models/Memory';

export async function GET() {
  try {
    await dbConnect();
    const memories = await Memory.find({}).sort({ updatedAt: -1 });
    return NextResponse.json(memories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    if (Array.isArray(body)) {
      // Migration mode
      const operations = body.map((memory) => ({
        updateOne: {
          filter: { _id: memory.id || memory._id },
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
            } 
          },
          upsert: true,
        },
      }));

      await Memory.bulkWrite(operations);
      return NextResponse.json({ message: 'Memory migration successful' });
    } else {
      // Single memory creation
      const memory = await Memory.create(body);
      return NextResponse.json(memory);
    }
  } catch (error) {
    console.error('Failed to save memory:', error);
    return NextResponse.json({ error: 'Failed to save memory' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await dbConnect();
    const { id } = await req.json();
    const memory = await Memory.findByIdAndDelete(id);
    if (!memory) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Memory deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
