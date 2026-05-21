import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const body = await request.json();

    if (body?.payload?.phone) {
      body.payload.phone = cleanPhone(String(body.payload.phone));
    }

    const existing = await ScheduleTask.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Schedule task not found' }, { status: 404 });
    }

    const merged = { ...existing.toObject(), ...body };
    if (body.payload) merged.payload = { ...existing.payload, ...body.payload };

    const shouldRecompute = body.scheduleType || body.runAt || body.intervalMinutes;
    if (shouldRecompute) {
      merged.nextRunAt = computeNextRunAt(merged);
    }

    const task = await ScheduleTask.findByIdAndUpdate(id, merged, {
      new: true,
      runValidators: true,
    });

    return NextResponse.json({ success: true, data: task });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const deletedTask = await ScheduleTask.findByIdAndDelete(id);
    if (!deletedTask) {
      return NextResponse.json({ success: false, error: 'Schedule task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
