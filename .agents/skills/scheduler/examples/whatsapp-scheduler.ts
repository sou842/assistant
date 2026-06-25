import { randomUUID } from 'crypto';

// The SchedulerJob and WhatsAppPayload interfaces are defined in the SKILL.md rules
// and would typically be imported from a central types file.

export function createWhatsAppReminderJob(
  phoneNumber: string,
  appointmentTime: Date,
  customerName: string
): any { // Returns SchedulerJob
  
  // Calculate target time (e.g., 24 hours before appointment)
  const targetTime = new Date(appointmentTime.getTime() - 24 * 60 * 60 * 1000);

  return {
    jobId: randomUUID(),
    targetTime: targetTime.toISOString(),
    type: 'whatsapp',
    status: 'pending',
    payload: {
      // Ensure phone number has country code but no '+' (e.g., '14155552671')
      toPhoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
      
      // Using a Meta WhatsApp Business Template
      template: {
        name: 'appointment_reminder_24h',
        language: 'en_US',
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: customerName
              },
              {
                type: 'date_time',
                text: appointmentTime.toLocaleString()
              }
            ]
          }
        ]
      }
    },
    metadata: {
      source: 'booking_system',
      priority: 'high'
    }
  };
}

// Example usage:
// const job = createWhatsAppReminderJob('15551234567', new Date('2026-07-01T10:00:00Z'), 'Alice');
// await database.collection('scheduled_jobs').insertOne(job);
