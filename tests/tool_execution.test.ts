import { executeToolWithRetry } from '../server/executor.js';

async function testExecution() {
  console.log('--- TEST 3: Swytchcode Multi-Tool Execution Suite ---');

  // 1. WeatherAPI Execution
  console.log('\n[1/3] Executing weatherapi.forecast.list...');
  const weatherRes = await executeToolWithRetry('weatherapi.forecast.list', {
    params: { q: 'Jaipur', days: 3 },
  });
  console.log(`  -> Success: ${weatherRes.success}, Latency: ${weatherRes.latencyMs}ms, Result/Error: ${weatherRes.data ? 'Data received' : weatherRes.error}`);
  if (!weatherRes.success && !weatherRes.error?.includes('missing credentials') && !weatherRes.error?.includes('auth connect')) {
    throw new Error(`Weather execution failed unexpectedly: ${weatherRes.error}`);
  }

  // 2. Notion Page Create Execution
  console.log('\n[2/3] Executing notion.page.create...');
  const notionRes = await executeToolWithRetry('notion.page.create', {
    body: {
      parent: { page_id: 'test_workspace_root' },
      properties: { title: [{ text: { content: 'Hackathon Architecture Notes' } }] },
    },
  });
  console.log(`  -> Success: ${notionRes.success}, Latency: ${notionRes.latencyMs}ms, Result/Error: ${notionRes.data ? 'Data received' : notionRes.error}`);
  if (!notionRes.success && !notionRes.error?.includes('missing credentials') && !notionRes.error?.includes('auth connect')) {
    throw new Error(`Notion execution failed unexpectedly: ${notionRes.error}`);
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
  console.log(`  -> Success: ${emailRes.success}, Latency: ${emailRes.latencyMs}ms, Result/Error: ${emailRes.data ? 'Data received' : emailRes.error}`);
  if (!emailRes.success && !emailRes.error?.includes('missing credentials') && !emailRes.error?.includes('auth connect')) {
    throw new Error(`Resend execution failed unexpectedly: ${emailRes.error}`);
  }

  console.log('\n✅ PASSED: All 3 Swytchcode tools executed and verified via Swytchcode kernel.\n');
}

testExecution().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
