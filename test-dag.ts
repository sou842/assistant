import mongoose from 'mongoose';
import { executeScheduleTaskRun } from './lib/schedule';
import dotenv from 'dotenv';
import dbConnect from './lib/dbConnect';
import User from './lib/models/User';
import ScheduleTask from './lib/models/ScheduleTask';
import ScheduleTaskRun from './lib/models/ScheduleTaskRun';

dotenv.config({ path: '.env.local' });

async function runTests() {
  await dbConnect();
  
  console.log('Connected to DB. Running tests...');

  const userId = new mongoose.Types.ObjectId();

  const mockTask = new ScheduleTask({
    title: 'Test DAG Workflow',
    userId,
    schedule: {
      type: 'one_time'
    },
    steps: [
      {
        id: 'fetch_latest_email',
        type: 'http_request',
        dependsOn: [],
        input: {
          url: 'https://jsonplaceholder.typicode.com/todos/1',
          method: 'GET'
        },
        output: { saveAs: 'latestEmail' }
      },
      {
        id: 'get_email_details',
        type: 'http_request',
        dependsOn: ['fetch_latest_email'],
        input: {
          url: 'https://jsonplaceholder.typicode.com/todos/{{context.latestEmail.id}}',
          method: 'GET'
        },
        output: { saveAs: 'emailDetails' }
      },
      {
        id: 'unrelated_step',
        type: 'http_request',
        dependsOn: [],
        input: {
          url: 'https://jsonplaceholder.typicode.com/todos/3',
          method: 'GET'
        },
        output: { saveAs: 'unrelatedData' }
      }
    ]
  });

  const mockRun = new ScheduleTaskRun({
    taskId: mockTask._id,
    startedAt: new Date(),
    status: 'running',
    completedSteps: [],
    context: {
      googleAccessToken: 'fake-token'
    }
  });

  console.log('Initial Run State:', mockRun.status, mockRun.completedSteps);

  try {
    await executeScheduleTaskRun(mockTask, mockRun);
    
    console.log('Execution completed!');
    console.log('Final Status:', mockRun.status);
    console.log('Completed Steps:', mockRun.completedSteps);
    console.log('Final Context Keys:', Object.keys(mockRun.context));
    
    if (mockRun.context.latestEmail && mockRun.context.emailDetails && mockRun.context.unrelatedData) {
      console.log('✅ Context variables mapped successfully via output.saveAs!');
      console.log('latestEmail ID:', mockRun.context.latestEmail.id);
      console.log('emailDetails ID:', mockRun.context.emailDetails.id);
    } else {
      console.error('❌ Missing context variables!');
      process.exit(1);
    }
    
    if (mockRun.completedSteps.length === 3) {
      console.log('✅ All 3 steps completed in a DAG manner!');
    } else {
      console.error('❌ DAG execution failed or hung!');
      process.exit(1);
    }

  } catch (err: any) {
    console.error('Error during execution:', err);
    process.exit(1);
  }

  process.exit(0);
}

runTests();
