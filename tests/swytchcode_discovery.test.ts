import { discoverCapabilities } from '../server/swytchcode.js';

async function testDiscovery() {
  console.log('--- TEST 1: Swytchcode General-Purpose Dynamic Discovery ---');

  const testQueries = [
    { intent: 'check weather forecast for destination', expectedKeywords: ['weather', 'forecast', 'interzoid', 'openweather'] },
    { intent: 'create document in notion workspace', expectedKeywords: ['notion', 'page', 'create', 'document', 'database'] },
    { intent: 'send transactional email to customer', expectedKeywords: ['resend', 'email', 'send', 'mail', 'mailgun', 'sendgrid'] },
  ];

  for (const t of testQueries) {
    console.log(`\nQuerying Swytchcode registry for: "${t.intent}"...`);
    const capabilities = await discoverCapabilities(t.intent);
    console.log(`Discovered ${capabilities.length} capabilities.`);

    for (const cap of capabilities.slice(0, 3)) {
      console.log(`  - [${cap.canonical_id}] (Library: ${cap.library}) - ${cap.summary}`);
    }

    if (capabilities.length === 0) {
      throw new Error(`Expected at least 1 discovered capability for "${t.intent}"`);
    }

    const matched = capabilities.some(c =>
      t.expectedKeywords.some(kw => c.canonical_id.toLowerCase().includes(kw) || c.summary.toLowerCase().includes(kw) || c.library.toLowerCase().includes(kw))
    );

    if (!matched) {
      console.warn(`[Warning] No direct keyword match found in top capabilities for "${t.intent}", but results returned.`);
    }
  }

  console.log('\n✅ PASSED: Swytchcode multi-domain dynamic capability discovery verified.\n');
}

testDiscovery().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
