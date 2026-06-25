import { randomUUID } from 'crypto';

export function createWeeklyNewsletterJob(
  subscriberEmails: string[],
  publishDate: Date,
  newsletterTitle: string,
  newsletterHtmlContent: string
): any { // Returns SchedulerJob
  
  return {
    jobId: randomUUID(),
    targetTime: publishDate.toISOString(),
    type: 'email',
    status: 'pending',
    payload: {
      to: subscriberEmails, // Array of strings is valid
      subject: `Your Weekly Update: ${newsletterTitle}`,
      html: newsletterHtmlContent,
      text: `Please view this email in a client that supports HTML. Title: ${newsletterTitle}`,
      fromName: 'The Weekly Newsletter Team'
    },
    metadata: {
      campaign: 'weekly_digest',
      batchSize: subscriberEmails.length
    }
  };
}

// Example usage:
// const job = createWeeklyNewsletterJob(
//   ['user1@example.com', 'user2@example.com'], 
//   new Date('2026-06-30T09:00:00Z'), 
//   'Tech Trends June 2026',
//   '<h1>Welcome to Tech Trends</h1><p>Here are the updates...</p>'
// );
// await database.collection('scheduled_jobs').insertOne(job);
