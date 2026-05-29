import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ScheduleTask from '@/lib/models/ScheduleTask';
import ScheduleTaskRun from '@/lib/models/ScheduleTaskRun';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const now = new Date();

    // 0. Reaper: Reset stuck tasks (> 15 mins)
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
    const stuckRuns = await ScheduleTaskRun.find({ status: 'running', startedAt: { $lt: fifteenMinsAgo } });
    for (const run of stuckRuns) {
      run.status = 'failed';
      run.error = 'Task execution timed out';
      run.endedAt = now;
      await run.save();
      await ScheduleTask.findByIdAndUpdate(run.taskId, { isRunning: false, lastError: 'Task execution timed out' });
    }

    // 1. Queue new runs (fetch up to 100 to scale within limits)
    const dueTasks = await ScheduleTask.find({
      status: 'active',
      isRunning: false,
      nextRunAt: { $lte: now },
    }).limit(100);

    if (dueTasks.length === 0) {
      return NextResponse.json({ success: true, message: 'No tasks due' });
    }

    // 2. Dispatch tasks to Vercel Serverless Functions
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // We fire all HTTP requests concurrently.
    // Vercel will instantly spin up a micro-server for each request.
    const fetchPromises = dueTasks.map(task => {
      const taskUrl = `${baseUrl}/api/schedule/tasks/${task._id}/run`;
      // We don't care about the response body, just that it was dispatched
      return fetch(taskUrl, { method: 'POST' }).catch(err => console.error(`Failed to dispatch ${task._id}:`, err));
    });

    // Wait for dispatch to complete so Vercel doesn't kill the runner before they are sent
    await Promise.allSettled(fetchPromises);

    console.log(`Dispatched ${dueTasks.length} tasks to Vercel serverless functions.`);
    return NextResponse.json({ success: true, dispatched: dueTasks.length });
  } catch (error: any) {
    console.error('Runner error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
