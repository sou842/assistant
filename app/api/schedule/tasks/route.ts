import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';

export async function GET() {
  try {
    await dbConnect();
    const tasks = await ScheduleTask.find({}).sort({ updatedAt: -1 });
    return NextResponse.json({ success: true, data: tasks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const payload = {
      ...(body.payload || {}),
      phone: body.payload?.phone ? cleanPhone(String(body.payload.phone)) : body.payload?.phone,
    };

    const data = { ...body, payload };
    const nextRunAt = computeNextRunAt(data);

    const task = await ScheduleTask.create({
      ...data,
      nextRunAt,
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
