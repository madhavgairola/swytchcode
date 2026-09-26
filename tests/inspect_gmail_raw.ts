import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function inspectGmail() {
  const r = await executeSwytchcodeMethod('gmail.user.threads.get', { params: { userId: 'me', maxResults: 5 } });
  console.log('GMAIL DATA KEYS:', Object.keys(r.data || {}));
  console.log('INNER DATA KEYS:', Object.keys(r.data?.data || {}));
  const threads = r.data?.data?.threads || r.data?.threads || [];
  console.log('THREADS COUNT:', threads.length);
  if (threads.length > 0) {
    console.log('FIRST THREAD:', JSON.stringify(threads[0], null, 2));
  }
}

inspectGmail().catch(console.error);
