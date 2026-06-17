export type TemplateField = {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number';
  placeholder?: string;
  required?: boolean;
};

export type ScheduleTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  fields: TemplateField[];
  defaultSchedule: {
    scheduleType: 'one_time' | 'recurring';
    intervalMinutes?: number;
  };
  generateTask: (inputs: Record<string, string>) => any;
};

export const scheduleTemplates: ScheduleTemplate[] = [
  // Productivity & Work
  {
    id: "daily_standup",
    title: "Daily Standup Reminder",
    description: "Perfect for quick reporting during daily standup meetings.",
    category: "Productivity & Work",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: "Daily Standup Reminder",
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: "Reminder: It's time for your daily standup! Reply with your tasks for today."
            }
          }
        ]
      };
    }
  },
  {
    id: "weekly_plan_email",
    title: "Weekly Motivation Email",
    description: "Start your week with an automatically generated overview and motivation.",
    category: "Productivity & Work",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 10080
    },
    fields: [
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      const step1Id = crypto.randomUUID();
      return {
        title: "Weekly Motivation Email",
        steps: [
          {
            id: step1Id,
            type: "ai_prompt",
            config: {
              prompt: "Write a short, uplifting professional motivation message to start the week strong."
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: "Your Weekly Motivation",
              bodyTemplate: `Here is your motivation for the week:\n\n{{context.${step1Id}.data}}`
            }
          }
        ]
      };
    }
  },

  // Reminders & Alerts
  {
    id: "weather_motivation",
    title: "Morning Weather & Motivation",
    description: "Get the daily weather and a short motivational quote.",
    category: "Reminders & Alerts",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "city", label: "City", type: "text", placeholder: "New York", required: true },
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      const weatherStepId = crypto.randomUUID();
      const aiStepId = crypto.randomUUID();

      return {
        title: `Morning Routine for ${inputs.city}`,
        steps: [
          {
            id: weatherStepId,
            type: "fetch_weather",
            config: {
              city: inputs.city
            }
          },
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: `Write a very short 2-sentence morning greeting. First sentence should mention the weather which is: {{context.${weatherStepId}.weather[0].description}}. Second sentence should be a motivating quote.`
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: `{{context.${aiStepId}.data}}`
            }
          }
        ]
      };
    }
  },
  {
    id: "quick_reminder",
    title: "Quick One-Off Reminder",
    description: "A quick one-off reminder via email.",
    category: "Reminders & Alerts",
    defaultSchedule: {
      scheduleType: "one_time",
    },
    fields: [
      { id: "reminder", label: "What to remind?", type: "text", placeholder: "Check the oven", required: true },
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: `Reminder: ${inputs.reminder}`,
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: `Reminder: ${inputs.reminder}`,
              bodyTemplate: `This is your automated reminder:\n\n${inputs.reminder}`
            }
          }
        ]
      };
    }
  },

  // Communication
  {
    id: "daily_joke",
    title: "Daily Joke on WhatsApp",
    description: "Receive a funny, clean dad joke every day.",
    category: "Communication",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      const aiStepId = crypto.randomUUID();

      return {
        title: "Daily Joke",
        steps: [
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: "Tell me a funny, clean dad joke. Just the joke."
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: `{{context.${aiStepId}.data}}`
            }
          }
        ]
      };
    }
  },
  // --- Health & Wellness ---
  {
    id: "water_hydration_reminder",
    title: "Hydration Check-in",
    description: "A simple, recurring nudge to drink a glass of water.",
    category: "Health & Wellness",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 120 // Every 2 hours
    },
    fields: [
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: "Hydration Reminder",
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: "💧 Hydration check! It's time to drink a glass of water to stay focused and energized."
            }
          }
        ]
      };
    }
  },
  {
    id: "evening_journal_prompt",
    title: "Evening Reflection",
    description: "Get a unique journaling prompt every evening to wind down.",
    category: "Health & Wellness",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      const aiStepId = crypto.randomUUID();
      return {
        title: "Evening Journal Prompt",
        steps: [
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: "Generate a thoughtful, single-question journaling prompt for evening reflection. Keep it brief."
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: "Tonight's Journal Prompt 🌙",
              bodyTemplate: `Take a few minutes to reflect on this:\n\n{{context.${aiStepId}.data}}`
            }
          }
        ]
      };
    }
  },
  {
    id: "medication_reminder",
    title: "Medication Reminder",
    description: "A critical daily reminder to take specific medication or vitamins.",
    category: "Health & Wellness",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "medication", label: "Medication/Vitamin Name", type: "text", placeholder: "Vitamin D", required: true },
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: `Medication Reminder: ${inputs.medication}`,
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: `💊 Reminder: It's time to take your ${inputs.medication}. Please reply 'done' when you have taken it.`
            }
          }
        ]
      };
    }
  },

  // --- Learning ---
  {
    id: "word_of_the_day",
    title: "Word of the Day",
    description: "Expand your vocabulary with a new, advanced word and its definition daily.",
    category: "Learning",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      const aiStepId = crypto.randomUUID();
      return {
        title: "Word of the Day",
        steps: [
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: "Provide an advanced English word, its definition, and one short sentence using it. Format cleanly."
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: `📚 Word of the Day:\n\n{{context.${aiStepId}.data}}`
            }
          }
        ]
      };
    }
  },
  {
    id: "daily_trivia",
    title: "Daily Trivia Fact",
    description: "Learn a highly interesting, obscure historical or scientific fact every day.",
    category: "Learning",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      const aiStepId = crypto.randomUUID();
      return {
        title: "Daily Trivia",
        steps: [
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: "Tell me one obscure, fascinating fact about history, science, or space. Ensure it is factually accurate and 2-3 sentences long."
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: "Did You Know? 🧠",
              bodyTemplate: `Here is your daily trivia fact:\n\n{{context.${aiStepId}.data}}`
            }
          }
        ]
      };
    }
  },

  // --- Productivity & Work ---
  {
    id: "deep_work_trigger",
    title: "Deep Work Session Prep",
    description: "A prompt to close tabs, mute notifications, and set an intention for focused work.",
    category: "Productivity & Work",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 1440
    },
    fields: [
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: "Deep Work Trigger",
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: "🎧 Deep work time. Mute your notifications, close unnecessary tabs, and reply with the ONE task you are focusing on right now."
            }
          }
        ]
      };
    }
  },
  {
    id: "monthly_finance_review",
    title: "Monthly Expense Review",
    description: "A recurring prompt to check your bank statements and review your budget.",
    category: "Productivity & Work",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 43200 // Roughly 30 days
    },
    fields: [
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: "Monthly Finance Review",
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: "📊 Monthly Financial Review Time",
              bodyTemplate: "It's time for your monthly financial check-in.\n\n1. Review your bank/credit statements.\n2. Categorize major expenses.\n3. Verify all active subscriptions.\n4. Set your budget for next month."
            }
          }
        ]
      };
    }
  },

  // --- Reminders & Alerts ---
  {
    id: "recurring_chores",
    title: "Household Chore Reminder",
    description: "Automate reminders for chores like taking out the trash or watering plants.",
    category: "Reminders & Alerts",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 10080 // Weekly
    },
    fields: [
      { id: "chore", label: "Chore Description", type: "text", placeholder: "Take out the recycling", required: true },
      { id: "whatsapp", label: "WhatsApp Number", type: "tel", placeholder: "+1234567890", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: `Chore Reminder: ${inputs.chore}`,
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_whatsapp",
            config: {
              phone: inputs.whatsapp,
              messageTemplate: `🧹 Household Reminder: Don't forget to ${inputs.chore} today!`
            }
          }
        ]
      };
    }
  },
  {
    id: "subscription_cancel_warning",
    title: "Trial Cancellation Warning",
    description: "A one-time alert to cancel a free trial before your card is charged.",
    category: "Reminders & Alerts",
    defaultSchedule: {
      scheduleType: "one_time"
    },
    fields: [
      { id: "service", label: "Service Name", type: "text", placeholder: "Netflix", required: true },
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      return {
        title: `Cancel Trial: ${inputs.service}`,
        steps: [
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: `Action Required: Cancel ${inputs.service} Trial`,
              bodyTemplate: `This is your automated reminder to cancel your free trial for ${inputs.service} before you are charged. Log in to their portal now to end the subscription.`
            }
          }
        ]
      };
    }
  },

  // --- Communication ---
  {
    id: "weekend_activity_suggester",
    title: "Weekend Activity Suggester",
    description: "Get AI-generated ideas for local activities to do this weekend.",
    category: "Communication",
    defaultSchedule: {
      scheduleType: "recurring",
      intervalMinutes: 10080 // Weekly (ideal for Thursdays/Fridays)
    },
    fields: [
      { id: "city", label: "Your City", type: "text", placeholder: "Chicago", required: true },
      { id: "email", label: "Email Address", type: "email", placeholder: "you@example.com", required: true },
    ],
    generateTask: (inputs) => {
      const aiStepId = crypto.randomUUID();
      return {
        title: "Weekend Ideas",
        steps: [
          {
            id: aiStepId,
            type: "ai_prompt",
            config: {
              prompt: `Suggest 3 unique, engaging weekend activities that someone could do in or around ${inputs.city}. Include a mix of indoor and outdoor options.`
            }
          },
          {
            id: crypto.randomUUID(),
            type: "send_email",
            config: {
              to: inputs.email,
              subject: "Your Weekend Plans are Here! 🎉",
              bodyTemplate: `Looking for something to do this weekend in ${inputs.city}? Here are a few ideas:\n\n{{context.${aiStepId}.data}}\n\nHave a great weekend!`
            }
          }
        ]
      };
    }
  }
];
