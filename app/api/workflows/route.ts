import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Workflow from '@/lib/models/Workflow';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    let query: any = {
      $or: [
        { userId: session.user.id },
        { isPublic: true }
      ]
    };

    if (q) {
      const keywords = q.toLowerCase().split(/[\s,._-]+/).filter(w => w.length > 2);
      if (keywords.length > 0) {
        const regexes = keywords.map(w => new RegExp(w, 'i'));
        query = {
          $and: [
            {
              $or: [
                { userId: session.user.id },
                { isPublic: true }
              ]
            },
            {
              $or: [
                { title: { $in: regexes } },
                { description: { $in: regexes } }
              ]
            }
          ]
        };
      }
    }

    const workflows = await Workflow.find(query).sort({ updatedAt: -1 }).limit(10);
    return NextResponse.json({ success: true, data: workflows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    body.userId = session.user.id;
    const workflow = await Workflow.create(body);
    return NextResponse.json({ success: true, data: workflow }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
