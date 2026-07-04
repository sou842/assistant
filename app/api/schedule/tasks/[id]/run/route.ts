import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import { executeScheduleTaskRun } from '@/lib/schedule';
import ScheduleTaskRun from '@/lib/models/ScheduleTaskRun';

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
    
    const run = await ScheduleTaskRun.create({
      taskId: task._id,
      startedAt: new Date(),
      status: 'running',
      currentStepIndex: 0,
      context: {},
    });

    try {
      const result = await executeScheduleTaskRun(task, run);
      return NextResponse.json({ success: result.success, data: result });
    } catch (execError: any) {
      run.status = 'failed';
      run.error = execError.message;
      run.endedAt = new Date();
      await run.save();
      await ScheduleTask.findByIdAndUpdate(id, { isRunning: false, lastError: execError.message });
      return NextResponse.json({ success: false, error: execError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
