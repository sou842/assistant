import { randomUUID } from 'crypto';

export function createDataSyncJob(
  targetTime: Date,
  syncEndpointUrl: string,
  apiToken: string
): any { // Returns SchedulerJob
  
  return {
    jobId: randomUUID(),
    targetTime: targetTime.toISOString(),
    type: 'api',
    status: 'pending',
    payload: {
      url: syncEndpointUrl,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: {
        action: 'trigger_full_sync',
        source: 'scheduler_service'
      }
    },
    metadata: {
      retryCount: 0,
      maxRetries: 3
    }
  };
}

// Example usage:
// const job = createDataSyncJob(
//   new Date('2026-06-25T03:00:00Z'), 
//   'https://api.internal-system.com/v1/sync',
//   'secret-token-xyz'
// );
// await database.collection('scheduled_jobs').insertOne(job);
