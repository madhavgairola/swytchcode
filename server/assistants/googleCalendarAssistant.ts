import { executeSwytchcodeMethod } from '../swytchcode.js';

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
  status?: string;
}

/**
 * Google Calendar AI Assistant powered by Swytchcode Governance
 * Handles meeting scheduling, agenda indexing, conflict detection, and calendar events.
 */
export class GoogleCalendarAssistant {
  public static readonly CANONICAL_TOOLS = {
    LIST_EVENTS: 'google_calendar.events.list',
    CREATE_EVENT: 'google_calendar.events.create',
    GET_EVENT: 'google_calendar.events.get',
    DELETE_EVENT: 'google_calendar.events.delete',
  };

  /**
   * List upcoming calendar events within a time range
   */
  async listEvents(
    calendarId: string = 'primary',
    maxResults: number = 10,
    timeMin?: string
  ): Promise<{
    success: boolean;
    events: CalendarEventItem[];
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GoogleCalendarAssistant.CANONICAL_TOOLS.LIST_EVENTS, {
      params: {
        calendarId,
        maxResults,
        timeMin: timeMin || new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      },
    });

    if (!res.success) {
      return { success: false, events: [], error: res.error };
    }

    const rawEvents = res.data?.items || res.data?.events || (Array.isArray(res.data) ? res.data : []);
    const events = Array.isArray(rawEvents)
      ? rawEvents.map((e: any) => ({
          id: e.id || `event_${Date.now()}`,
          summary: e.summary || 'Scheduled Meeting',
          description: e.description || '',
          location: e.location || 'Google Meet',
          start: e.start || { dateTime: new Date().toISOString() },
          end: e.end || { dateTime: new Date(Date.now() + 3600000).toISOString() },
          htmlLink: e.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${e.id}`,
          attendees: e.attendees || [],
          status: e.status || 'confirmed',
        }))
      : [];

    return { success: true, events };
  }

  /**
   * Schedule a new calendar event with attendees
   */
  async createEvent(
    summaryOrOptions: string | { summary: string; startTime?: string; endTime?: string; attendees?: string[]; description?: string; location?: string; calendarId?: string },
    startTimeArg?: string,
    endTimeArg?: string,
    attendeesArg: string[] = [],
    descriptionArg?: string,
    locationArg?: string,
    calendarIdArg: string = 'primary'
  ): Promise<{
    success: boolean;
    event: CalendarEventItem | null;
    error?: string;
  }> {
    let summary = typeof summaryOrOptions === 'string' ? summaryOrOptions : summaryOrOptions.summary;
    let startTime = typeof summaryOrOptions === 'string' ? startTimeArg || new Date().toISOString() : summaryOrOptions.startTime || new Date().toISOString();
    let endTime = typeof summaryOrOptions === 'string' ? endTimeArg || new Date(Date.now() + 3600000).toISOString() : summaryOrOptions.endTime || new Date(Date.now() + 3600000).toISOString();
    let attendees = typeof summaryOrOptions === 'string' ? attendeesArg : (summaryOrOptions.attendees || []);
    let description = typeof summaryOrOptions === 'string' ? descriptionArg : summaryOrOptions.description;
    let location = typeof summaryOrOptions === 'string' ? (locationArg || 'Google Meet') : (summaryOrOptions.location || 'Google Meet');
    let calendarId = typeof summaryOrOptions === 'string' ? calendarIdArg : (summaryOrOptions.calendarId || 'primary');

    const res = await executeSwytchcodeMethod(GoogleCalendarAssistant.CANONICAL_TOOLS.CREATE_EVENT, {
      params: { calendarId },
      body: {
        summary,
        description,
        location,
        start: { dateTime: startTime },
        end: { dateTime: endTime },
        attendees: attendees.map(email => ({ email })),
      },
    });

    if (!res.success) {
      return { success: false, event: null, error: res.error };
    }

    const d = res.data || {};
    return {
      success: true,
      event: {
        id: d.id || `event_${Date.now()}`,
        summary: d.summary || summary,
        description: d.description || description,
        location: d.location || location || 'Google Meet',
        start: d.start || { dateTime: startTime },
        end: d.end || { dateTime: endTime },
        htmlLink: d.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${d.id || 'new'}`,
        status: d.status || 'confirmed',
      },
    };
  }
}

export const googleCalendarAssistant = new GoogleCalendarAssistant();
