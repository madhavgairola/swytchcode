import {
  validateMethodAgainstTooling,
  validateAndFormatMethodInputs,
  isConsequentialMethod,
} from '../server/validator.js';

function testValidation() {
  console.log('--- TEST 2: Method & Security Validation Matrix ---');

  // 1. Verify all registered tools in tooling.json
  const registeredToolChecks = [
    { id: 'weatherapi.forecast.list', expectedSideEffect: false },
    { id: 'notion.page.create', expectedSideEffect: true },
    { id: 'resend.email.create', expectedSideEffect: true },
  ];

  for (const t of registeredToolChecks) {
    const check = validateMethodAgainstTooling(t.id);
    console.log(`Checking '${t.id}': valid=${check.isValid}, integration=${check.integrationName}, isSideEffect=${check.isSideEffect}`);
    if (!check.isValid || !check.isRegisteredLocally) {
      throw new Error(`Expected '${t.id}' to be valid and registered in tooling.json`);
    }
    if (check.isSideEffect !== t.expectedSideEffect) {
      throw new Error(`Expected isSideEffect=${t.expectedSideEffect} for '${t.id}', got ${check.isSideEffect}`);
    }
  }

  // 2. Reject unverified / unauthorized arbitrary methods
  const invalidId = 'arbitrary_unregistered_hack.execute';
  const invalidCheck = validateMethodAgainstTooling(invalidId);
  console.log(`Checking '${invalidId}': valid=${invalidCheck.isValid}, reason="${invalidCheck.reason}"`);
  if (invalidCheck.isValid) {
    throw new Error(`Expected '${invalidId}' to be rejected by security validator.`);
  }

  // 3. Validate and format Weather inputs
  const weatherInput = validateAndFormatMethodInputs('weatherapi.forecast.list', { q: 'Jaipur', days: 3 });
  if (!weatherInput.isValid || weatherInput.formattedArgs.params.q !== 'Jaipur') {
    throw new Error('Weather input validation failed');
  }

  // 4. Validate and format Notion inputs
  const notionInput = validateAndFormatMethodInputs('notion.page.create', { title: 'Test Page' });
  if (!notionInput.isValid || !notionInput.formattedArgs.body?.properties?.title) {
    throw new Error('Notion input validation failed');
  }

  // 5. Validate and format Resend inputs
  const resendInput = validateAndFormatMethodInputs('resend.email.create', {
    to: 'tester@example.com',
    subject: 'Welcome',
    text: 'Hello!',
  });
  if (!resendInput.isValid || resendInput.formattedArgs.body?.to[0] !== 'tester@example.com') {
    throw new Error('Resend input validation failed');
  }

  console.log('✅ PASSED: All registered methods, parameters, and security policies validated.\n');
}

testValidation();
