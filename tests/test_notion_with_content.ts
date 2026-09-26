import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function testNotionWithContent() {
  const gmailRes = await executeSwytchcodeMethod('gmail.user.threads.get', {
    params: { userId: 'me', maxResults: 10 }
  });

  const rawThreads = gmailRes.data?.data?.threads || gmailRes.data?.threads || [];
  console.log(`Fetched ${rawThreads.length} threads from Gmail.`);

  const blocks: any[] = [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{ type: 'text', text: { content: '📬 Latest 10 Emails Digest' } }]
      }
    },
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: 'Automated executive summary compiled live via Swytchcode from Gmail mailbox:' } }]
      }
    },
    {
      object: 'block',
      type: 'divider',
      divider: {}
    }
  ];

  rawThreads.slice(0, 10).forEach((t: any, idx: number) => {
    const cleanSnippet = (t.snippet || 'No snippet available').replace(/[\u034f\u00ad\u200b\u200c\u200d\ufeff\s]+/g, ' ').trim();
    blocks.push({
      object: 'block',
      type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [
          { type: 'text', text: { content: `Thread #${idx + 1}: `, link: null }, annotations: { bold: true } },
          { type: 'text', text: { content: cleanSnippet } }
        ]
      }
    });
  });

  const notionPayload = {
    body: {
      parent: { page_id: 'f257ca34-a287-40df-8c3f-9232a8c64ec3' },
      properties: {
        title: [{ text: { content: 'Executive Briefing: Latest 10 Email Threads (Populated)' } }]
      },
      children: blocks
    }
  };

  console.log('Sending Notion page create with', blocks.length, 'content blocks...');
  const notionRes = await executeSwytchcodeMethod('notion.page.create', notionPayload);
  console.log('NOTION RES:', notionRes.success ? `SUCCESS (Page URL: ${notionRes.data?.data?.url})` : notionRes.error);
}

testNotionWithContent().catch(console.error);
