import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function testNotionCreate() {
  const payload = {
    body: {
      parent: {
        page_id: 'f257ca34-a287-40df-8c3f-9232a8c64ec3',
      },
      properties: {
        title: [
          {
            text: {
              content: 'Autonomous Email Briefing Test',
            },
          },
        ],
      },
    },
  };

  const res = await executeSwytchcodeMethod('notion.page.create', payload);
  console.log('NOTION CREATE RESULT:', JSON.stringify(res, null, 2));
}

testNotionCreate().catch(console.error);
