import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { executeScheduleTask } from '@/lib/schedule';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;

    const task = await ScheduleTask.findById(id);
    if (!task) {
      return NextResponse.json({ success: false, error: 'Schedule task not found' }, { status: 404 });
    }

    if (task.isRunning) {
      return NextResponse.json({ success: false, error: 'Task is already running' }, { status: 409 });
    }

    await ScheduleTask.findByIdAndUpdate(id, { isRunning: true, status: 'active' });
    const result = await executeScheduleTask(task);

    return NextResponse.json({ success: result.success, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
