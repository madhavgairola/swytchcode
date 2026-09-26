import { executeSwytchcodeMethod } from '../swytchcode.js';

export interface SlackMessage {
  id: string;
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  threadTs?: string;
}

/**
 * Slack AI Assistant powered by Swytchcode Governance
 * Handles reading channels, retrieving conversation history, and posting messages/alerts.
 */
export class SlackAssistant {
  public static readonly CANONICAL_TOOLS = {
    CONVERSATIONS_HISTORY: 'slack.conversations.history',
    POST_MESSAGE: 'slack.chat.post_message',
    CONVERSATIONS_LIST: 'slack.conversations.list',
  };

  /**
   * Fetch conversation history from a Slack channel
   */
  async getChannelHistory(channelId: string, limit: number = 20): Promise<{
    success: boolean;
    messages: SlackMessage[];
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(SlackAssistant.CANONICAL_TOOLS.CONVERSATIONS_HISTORY, {
      params: { channel: channelId, limit },
    });

    if (!res.success) {
      return { success: false, messages: [], error: res.error };
    }

    const messages = Array.isArray(res.data?.messages)
      ? res.data.messages.map((m: any, idx: number) => ({
          id: m.ts || `msg-${idx}`,
          channel: channelId,
          user: m.user || 'U_ENGINEER',
          text: m.text || '',
          timestamp: m.ts ? new Date(parseFloat(m.ts) * 1000).toISOString() : new Date().toISOString(),
          threadTs: m.thread_ts,
        }))
      : [];

    return { success: true, messages };
  }

  /**
   * Post a formatted message or alert to a Slack channel (Governed Action)
   */
  async postMessage(options: {
    channel: string;
    text: string;
    blocks?: any[];
  }): Promise<{
    success: boolean;
    messageTs?: string;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(SlackAssistant.CANONICAL_TOOLS.POST_MESSAGE, {
      body: {
        channel: options.channel,
        text: options.text,
        blocks: options.blocks,
      },
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, messageTs: res.data?.ts || 'msg_ts_ok' };
  }
}

export const slackAssistant = new SlackAssistant();
