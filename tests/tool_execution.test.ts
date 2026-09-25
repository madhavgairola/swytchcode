import { executeToolWithRetry } from '../server/executor.js';

async function testExecution() {
  console.log('--- TEST 3: Swytchcode Multi-Tool Execution Suite ---');

  // 1. WeatherAPI Execution
  console.log('\n[1/3] Executing weatherapi.forecast.list...');
  const weatherRes = await executeToolWithRetry('weatherapi.forecast.list', {
    params: { q: 'Jaipur', days: 3 },
  });
  console.log(`  -> Status: ${weatherRes.success}, Latency: ${weatherRes.latencyMs}ms, Mocked: ${weatherRes.isMocked}`);
  if (!weatherRes.success || !weatherRes.data) {
    throw new Error(`Weather execution failed: ${weatherRes.error}`);
  }

  // 2. Notion Page Create Execution
  console.log('\n[2/3] Executing notion.page.create...');
  const notionRes = await executeToolWithRetry('notion.page.create', {
    body: {
      parent: { page_id: 'test_workspace_root' },
      properties: { title: [{ text: { content: 'Hackathon Architecture Notes' } }] },
    },
  });
  console.log(`  -> Status: ${notionRes.success}, Latency: ${notionRes.latencyMs}ms, Page ID: ${notionRes.data?.id}`);
  if (!notionRes.success || !notionRes.data) {
    throw new Error(`Notion execution failed: ${notionRes.error}`);
  }

  // 3. Resend Email Create Execution
  console.log('\n[3/3] Executing resend.email.create...');
  const emailRes = await executeToolWithRetry('resend.email.create', {
    body: {
      from: 'onboarding@resend.dev',
      to: ['developer@swytchcode.dev'],
      subject: 'Build Completed',
      text: 'The autonomous integration system is ready.',
    },
  });
  console.log(`  -> Status: ${emailRes.success}, Latency: ${emailRes.latencyMs}ms, Email ID: ${emailRes.data?.id}`);
  if (!emailRes.success || !emailRes.data) {
    throw new Error(`Resend execution failed: ${emailRes.error}`);
  }

  console.log('\n✅ PASSED: All 3 Swytchcode tools executed successfully via execution kernel.\n');
}

testExecution().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
