import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function test2StepLive() {
  console.log('1. Executing Step 1: Fetch 10 Gmail threads live...');
  const gmailRes = await executeSwytchcodeMethod('gmail.user.threads.get', {
    params: { userId: 'me', maxResults: 10 }
  });

  console.log('Gmail Result:', gmailRes.success ? `SUCCESS (${gmailRes.data?.data?.threads?.length || 10} threads)` : gmailRes.error);

  console.log('\n2. Executing Step 2: Create Notion page with the email summary...');
  const notionRes = await executeSwytchcodeMethod('notion.page.create', {
    body: {
      parent: { page_id: 'f257ca34-a287-40df-8c3f-9232a8c64ec3' },
      properties: {
        title: [{ text: { content: 'Executive Briefing: Latest 10 Email Threads' } }]
      }
    }
  });

  console.log('Notion Result:', notionRes.success ? `SUCCESS (Page URL: ${notionRes.data?.data?.url})` : notionRes.error);
}

test2StepLive().catch(console.error);
