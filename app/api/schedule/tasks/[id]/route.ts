import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { cleanPhone, computeNextRunAt } from '@/lib/schedule';
import { auth } from '@/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    if (body?.steps) {
      body.steps = body.steps.map((s: any) => {
        if (s.type === 'send_whatsapp' && s.config?.phone) {
          return {
            ...s,
            config: {
              ...s.config,
              phone: cleanPhone(String(s.config.phone)),
            }
          };
        }
        return s;
      });
    }

    const existing = await ScheduleTask.findOne({ _id: id, userId: session.user.id });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Schedule task not found' }, { status: 404 });
    }

    const merged = { ...existing.toObject(), ...body };

    const shouldRecompute = body.scheduleType || body.runAt || body.intervalMinutes;
    if (shouldRecompute) {
      merged.nextRunAt = computeNextRunAt(merged);
    }

    const task = await ScheduleTask.findOneAndUpdate({ _id: id, userId: session.user.id }, merged, {
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
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const deletedTask = await ScheduleTask.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!deletedTask) {
      return NextResponse.json({ success: false, error: 'Schedule task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
