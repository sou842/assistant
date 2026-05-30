import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/lib/models/article';

export async function GET() {
  try {
    await dbConnect();
    // Only fetch public articles for the front-end listing
    const articles = await Article.find({ isPublic: true }).sort({ createdAt: -1 });
    return NextResponse.json(articles);
  } catch (error: any) {
    console.error("Failed to fetch articles:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
