import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function checkAll() {
  const tests = [
    { name: 'Google Drive (drive.file.list)', id: 'drive.file.list', args: { params: { pageSize: 2 } } },
    { name: 'Gmail (gmail.user.threads.get)', id: 'gmail.user.threads.get', args: { params: { userId: 'me', maxResults: 2 } } },
    { name: 'Notion (notion.search.create)', id: 'notion.search.create', args: { body: { page_size: 2 } } },
    { name: 'WeatherAPI (weatherapi.forecast.list)', id: 'weatherapi.forecast.list', args: { params: { q: 'Tokyo', days: 1 } } },
  ];

  for (const t of tests) {
    console.log(`\nTesting: ${t.name}...`);
    const res = await executeSwytchcodeMethod(t.id, t.args);
    if (res.success) {
      console.log(`✅ SUCCESS (Live Production):`, JSON.stringify(res.data).substring(0, 120) + '...');
    } else {
      console.log(`❌ FAILED:`, res.error);
    }
  }
}

checkAll().catch(console.error);
