export const homeFeatures = [
  {
    title: 'Automated Scheduler. Plan effortlessly.',
    description:
      'Set up one-time or recurring cron-jobs. Let the AI autonomously manage your time, meetings, and daily briefings without you lifting a finger.',
    image:
      'https://res.cloudinary.com/dkhh5ugbs/image/upload/v1779645194/rxt7ftawo1etlateyans.png',
    alt: 'Scheduler Feature',
    buttonText: 'Start Scheduling',
    reverse: false,
    points: [
      'Manage time across timezones',
      'Automated meeting links',
      'Customizable recurring events',
    ],
  },
  {
    title: 'Seamless Integrations. Connect everything.',
    description:
      'Natively store markdown notes, interactive spreadsheets, and media galleries. Your personal data is automatically organized across all your connected apps.',
    image:
      'https://res.cloudinary.com/dkhh5ugbs/image/upload/v1779648230/hf7akdweg81vbkl76y0z.png',
    alt: 'Integration Feature',
    buttonText: 'Explore Integrations',
    reverse: true,
    points: [
      'Connect to 100+ platforms',
      'Real-time bidirectional sync',
      'Secure API access keys',
    ],
  },
  {
    title: 'Intelligent Tasks. Stay focused.',
    description:
      'Jarvis remembers your facts and context across sessions. Organize your work with perfect isolation and persistent memory.',
    image:
      'https://res.cloudinary.com/dkhh5ugbs/image/upload/v1779647172/ca9q1hkhkcevje1xknb1.png',
    alt: 'Tasks Feature',
    buttonText: 'Manage Tasks',
    reverse: false,
    points: [
      'AI-driven prioritization',
      'Contextual smart reminders',
      'Persistent session memory',
    ],
  },
] as const

export const homeFaqItems = [
  {
    question: 'What is Jarvis AI?',
    answer:
      'Jarvis is your intelligent digital assistant, capable of managing tasks, scheduling meetings, and securely organizing your personal data like notes and spreadsheets across all your devices.',
  },
  {
    question: 'How does the Automated Scheduler work?',
    answer:
      'You can set up one-time or recurring cron-jobs using plain English. Jarvis will seamlessly interact with your connected calendars and send you automated reminders or briefings without any manual intervention.',
  },
  {
    question: 'Is my data secure and isolated?',
    answer:
      'Absolutely. Jarvis uses a secure, multi-tenant architecture to ensure your data—whether notes, API keys, or media—is perfectly isolated and accessible only by you.',
  },
  {
    question: 'What kind of integrations does Jarvis support?',
    answer:
      'We support over 100+ platforms including Google Workspace, Slack, Notion, and more. Our bidirectional sync ensures that your information is up-to-date everywhere instantly.',
  },
] as const
