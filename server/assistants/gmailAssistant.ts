import { executeSwytchcodeMethod, getMethodInfo } from '../swytchcode.js';

export interface GmailEmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
}

export interface GmailThread {
  id: string;
  snippet: string;
  historyId: string;
  messagesCount: number;
}

/**
 * Gmail AI Assistant powered by Swytchcode Governance
 * Handles searching threads, inspecting messages, drafting responses, and sending emails.
 */
export class GmailAssistant {
  public static readonly CANONICAL_TOOLS = {
    LIST_THREADS: 'gmail.user.threads.get',
    GET_THREAD: 'gmail.user.threads.get1',
    LIST_MESSAGES: 'gmail.user.messages.get',
    SEND_EMAIL: 'gmail.user.send.create1',
    DELETE_THREAD: 'gmail.user.threads.delete',
  };

  /**
   * Search and list recent email threads from the user's Gmail mailbox
   */
  async listThreads(userId: string = 'me', maxResults: number = 10, query?: string): Promise<{
    success: boolean;
    threads: GmailThread[];
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GmailAssistant.CANONICAL_TOOLS.LIST_THREADS, {
      params: { userId, maxResults, q: query },
    });

    if (!res.success) {
      return { success: false, threads: [], error: res.error };
    }

    const rawThreads = res.data?.threads || res.data?.data?.threads || (Array.isArray(res.data) ? res.data : []);
    const threads = Array.isArray(rawThreads)
      ? rawThreads.map((t: any) => ({
          id: t.id,
          snippet: t.snippet || '',
          historyId: t.historyId || '',
          messagesCount: t.messages?.length || 1,
        }))
      : [];

    return { success: true, threads };
  }

  /**
   * Retrieve a specific email thread by its ID with full message details
   */
  async getThread(threadId: string, userId: string = 'me'): Promise<{
    success: boolean;
    thread: any | null;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GmailAssistant.CANONICAL_TOOLS.GET_THREAD, {
      params: { id: threadId, userId },
    });

    if (!res.success) {
      return { success: false, thread: null, error: res.error };
    }

    return { success: true, thread: res.data };
  }

  /**
   * Send an email message via Swytchcode (Governed Action with side-effect safety gate)
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    body: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GmailAssistant.CANONICAL_TOOLS.SEND_EMAIL, {
      params: { userId: options.userId || 'me' },
      body: {
        to: options.to,
        subject: options.subject,
        raw: Buffer.from(`To: ${options.to}\r\nSubject: ${options.subject}\r\n\r\n${options.body}`).toString('base64'),
      },
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, messageId: res.data?.id || res.data?.messageId || 'sent_msg_ok' };
  }

  /**
   * Delete an email thread by ID (Consequential Mutating Action)
   */
  async deleteThread(threadId: string, userId: string = 'me'): Promise<{
    success: boolean;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GmailAssistant.CANONICAL_TOOLS.DELETE_THREAD, {
      params: { id: threadId, userId },
    });

    return { success: res.success, error: res.error };
  }
}

export const gmailAssistant = new GmailAssistant();
