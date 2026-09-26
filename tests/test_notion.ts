import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function testNotion() {
  const res = await executeSwytchcodeMethod('notion.search.create', { body: { page_size: 5 } });
  console.log('NOTION RESULTS:', JSON.stringify(res.data, null, 2));
}

testNotion().catch(console.error);
