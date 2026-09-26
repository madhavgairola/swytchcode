export * from './gmailAssistant.js';
export * from './slackAssistant.js';
export * from './notionAssistant.js';
export * from './googleDriveAssistant.js';
export * from './boxAssistant.js';
export * from './githubAssistant.js';
export * from './googleCalendarAssistant.js';

import { gmailAssistant, GmailAssistant } from './gmailAssistant.js';
import { slackAssistant, SlackAssistant } from './slackAssistant.js';
import { notionAssistant, NotionAssistant } from './notionAssistant.js';
import { googleDriveAssistant, GoogleDriveAssistant } from './googleDriveAssistant.js';
import { boxAssistant, BoxAssistant } from './boxAssistant.js';
import { githubAssistant, GitHubAssistant } from './githubAssistant.js';
import { googleCalendarAssistant, GoogleCalendarAssistant } from './googleCalendarAssistant.js';

export interface AssistantMetadata {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  accentColor: string;
  canonicalTools: string[];
}

export const REGISTERED_ASSISTANTS: Record<string, AssistantMetadata> = {
  gmail: {
    id: 'gmail',
    name: 'Gmail AI Assistant',
    category: 'Communication',
    description: 'Searches mailbox threads, drafts executive replies, and dispatches governed emails.',
    icon: 'Mail',
    accentColor: '#38bdf8',
    canonicalTools: Object.values(GmailAssistant.CANONICAL_TOOLS),
  },
  slack: {
    id: 'slack',
    name: 'Slack AI Assistant',
    category: 'Team Collaboration',
    description: 'Reads channel history, extracts architecture consensus, and broadcasts team alerts.',
    icon: 'MessageSquare',
    accentColor: '#22c55e',
    canonicalTools: Object.values(SlackAssistant.CANONICAL_TOOLS),
  },
  notion: {
    id: 'notion',
    name: 'Notion AI Assistant',
    category: 'Knowledge Workspace',
    description: 'Queries engineering wikis, creates structured RFCs, and publishes formatted postmortems.',
    icon: 'BookOpen',
    accentColor: '#a855f7',
    canonicalTools: Object.values(NotionAssistant.CANONICAL_TOOLS),
  },
  google_drive: {
    id: 'google_drive',
    name: 'Google Drive AI Assistant',
    category: 'Cloud Storage',
    description: 'Indexes technical blueprints, searches architecture RFCs, and inspects security specs.',
    icon: 'Folder',
    accentColor: '#fbbf24',
    canonicalTools: Object.values(GoogleDriveAssistant.CANONICAL_TOOLS),
  },
  box: {
    id: 'box',
    name: 'Box AI Assistant',
    category: 'Compliance & Legal Storage',
    description: 'Audits SOC-2 Type II packages, retrieves DPA contracts, and exports compliance bundles.',
    icon: 'Database',
    accentColor: '#f97316',
    canonicalTools: Object.values(BoxAssistant.CANONICAL_TOOLS),
  },
  github: {
    id: 'github',
    name: 'GitHub AI Assistant',
    category: 'Developer & Repositories',
    description: 'Audits repositories, creates bug issues, tracks pull requests, and analyzes commits.',
    icon: 'GitBranch',
    accentColor: '#6366f1',
    canonicalTools: Object.values(GitHubAssistant.CANONICAL_TOOLS),
  },
  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar AI Assistant',
    category: 'Schedule & Time Management',
    description: 'Lists upcoming meetings, schedules team synchronization sessions, and manages calendar events.',
    icon: 'Calendar',
    accentColor: '#ec4899',
    canonicalTools: Object.values(GoogleCalendarAssistant.CANONICAL_TOOLS),
  },
};

export const assistants = {
  gmail: gmailAssistant,
  slack: slackAssistant,
  notion: notionAssistant,
  googleDrive: googleDriveAssistant,
  box: boxAssistant,
  github: githubAssistant,
  googleCalendar: googleCalendarAssistant,
};
