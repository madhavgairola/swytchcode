import { executeSwytchcodeMethod } from '../swytchcode.js';

export interface NotionPageItem {
  id: string;
  title: string;
  url?: string;
  createdTime?: string;
  lastEditedTime?: string;
}

/**
 * Notion AI Assistant powered by Swytchcode Governance
 * Handles searching pages, creating documentation blocks, updating properties, and formatting briefs.
 */
export class NotionAssistant {
  public static readonly CANONICAL_TOOLS = {
    SEARCH: 'notion.search.create',
    CREATE_PAGE: 'notion.page.create',
    UPDATE_PAGE: 'notion.page.update',
    UPDATE_BLOCK: 'notion.block.update',
    DELETE_BLOCK: 'notion.block.delete',
  };

  /**
   * Search for Notion pages and databases by query
   */
  async search(query: string): Promise<{
    success: boolean;
    results: NotionPageItem[];
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(NotionAssistant.CANONICAL_TOOLS.SEARCH, {
      body: { query },
    });

    if (!res.success) {
      return { success: false, results: [], error: res.error };
    }

    const rawResults = res.data?.results || res.data?.data?.results || (Array.isArray(res.data) ? res.data : []);
    const results = Array.isArray(rawResults)
      ? rawResults.map((p: any) => ({
          id: p.id,
          title: p.properties?.title?.title?.[0]?.plain_text || p.properties?.Name?.title?.[0]?.plain_text || p.title || 'Untitled Page',
          url: p.url,
          createdTime: p.created_time,
          lastEditedTime: p.last_edited_time,
        }))
      : [];

    return { success: true, results };
  }

  /**
   * Create a structured documentation or briefing page in Notion (Governed Action)
   */
  async createPage(options: {
    parentPageId?: string;
    title: string;
    markdownContent?: string;
  }): Promise<{
    success: boolean;
    pageId?: string;
    url?: string;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(NotionAssistant.CANONICAL_TOOLS.CREATE_PAGE, {
      body: {
        parent: { page_id: options.parentPageId || 'workspace_root_id' },
        properties: {
          title: [{ text: { content: options.title } }],
        },
        children: options.markdownContent ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: options.markdownContent } }]
            }
          }
        ] : undefined
      },
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      pageId: res.data?.id || 'notion_page_ok',
      url: res.data?.url || `https://notion.so/${res.data?.id || 'page'}`,
    };
  }
}

export const notionAssistant = new NotionAssistant();
