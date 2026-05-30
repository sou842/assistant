import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/lib/models/article';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const article = await Article.findById(params.id);
    
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json(article);
  } catch (error: any) {
    console.error("Failed to fetch article:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
