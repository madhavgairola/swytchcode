import { analyzeGoalAndRequirements, createExecutionPlan } from '../server/gemini.js';
import { getRegisteredTools, validateStepAgainstUserIntent, detectRequestedProviders, isPureReadOrListRequest } from '../server/validator.js';

async function runTest() {
  console.log('🧪 Testing Planner & Intent Scoping for "List my Google Drive files."');
  
  const userPrompt = 'List my Google Drive files.';
  const requested = detectRequestedProviders(userPrompt);
  const isRead = isPureReadOrListRequest(userPrompt);
  console.log('1. Target Providers:', requested);
  console.log('2. Is Pure Read/List:', isRead);

  const goal = await analyzeGoalAndRequirements(userPrompt);
  console.log('3. Parsed Goal:', goal.goal);

  const tools = getRegisteredTools();
  const plan = await createExecutionPlan(goal, [
    { canonical_id: 'drive.file.list', library: 'drive', summary: 'Lists user files', type: 'api', distance: 0.1 },
    { canonical_id: 'box.zip_download.create', library: 'box', summary: 'Create zip download', type: 'api', distance: 0.1 },
  ], tools);

  console.log('4. Selected Plan Step:', plan.steps[0]?.canonicalId, `(${plan.steps[0]?.integrationName})`);

  const stepValidation = validateStepAgainstUserIntent(userPrompt, plan.steps[0], goal);
  console.log('5. Hard Pre-Execution Intent Validation:', stepValidation);

  if (plan.steps[0]?.canonicalId.includes('drive') && stepValidation.isValid) {
    console.log('✅ PLANNER SCOPING TEST PASSED: Selected Google Drive list tool, rejected Box zip download.');
  } else {
    console.error('❌ TEST FAILED: Selected wrong tool:', plan.steps[0]);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
