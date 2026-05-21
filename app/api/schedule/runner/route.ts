import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { executeScheduleTask } from '@/lib/schedule';

async function runDueScheduleTasks() {
  await dbConnect();

  const now = new Date();
  const dueTasks = await ScheduleTask.find({
    status: 'active',
    isRunning: false,
    nextRunAt: { $lte: now },
  }).limit(20);

  const results = [];

  for (const task of dueTasks) {
    const locked = await ScheduleTask.findOneAndUpdate(
      { _id: task._id, isRunning: false },
      { isRunning: true },
      { new: true }
    );

    if (!locked) continue;

    const result = await executeScheduleTask(locked);
    results.push({ taskId: String(task._id), ...result });
  }

  return { success: true, count: results.length, results };
}

export async function GET() {
  try {
    const data = await runDueScheduleTasks();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
