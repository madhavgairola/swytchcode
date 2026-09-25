import { analyzeGoalAndRequirements, createExecutionPlan, synthesizeTaskResult } from '../server/gemini.js';
import { getRegisteredTools } from '../server/validator.js';

async function testGemini() {
  console.log('--- TEST 4: Gemini General-Purpose Autonomous Reasoning Suite ---');

  // 1. Goal Analysis for Multi-Step Real-World Task
  const userPrompt = 'Check the weather in Tokyo for tomorrow, summarize recommendations, and draft a Notion trip page.';
  console.log(`Analyzing goal for: "${userPrompt}"...`);

  const goal = await analyzeGoalAndRequirements(userPrompt);
  console.log(`  - Goal: "${goal.goal}"`);
  console.log(`  - Intent Category: ${goal.intentCategory}`);
  console.log(`  - Location: ${goal.entities.location || goal.entities.destination}`);
  console.log(`  - Required Capabilities: [${goal.requiredCapabilities.join(', ')}]`);
  console.log(`  - Requires Confirmation: ${goal.requiresConfirmation}`);

  if (goal.requiredCapabilities.length === 0) {
    throw new Error('Expected at least 1 required capability query');
  }

  // 2. Planning against Registered Swytchcode Tools
  const registeredTools = getRegisteredTools();
  console.log('\nGenerating multi-step plan against registered tools...');
  const plan = await createExecutionPlan(
    goal,
    [
      { canonical_id: 'weatherapi.forecast.list', type: 'api', summary: 'Get weather forecast', library: 'WeatherAPI', distance: 0.1 },
      { canonical_id: 'notion.page.create', type: 'api', summary: 'Create a page', library: 'Notion', distance: 0.1 },
    ],
    registeredTools
  );

  console.log(`Plan Created: "${plan.title}" (${plan.steps.length} steps):`);
  for (const step of plan.steps) {
    console.log(`  [Step ${step.order}] ${step.canonicalId} -> ${step.action} (SideEffect: ${step.isSideEffect})`);
  }

  if (plan.steps.length === 0) {
    throw new Error('Execution plan returned 0 steps');
  }

  // 3. Synthesizing Task Result
  console.log('\nSynthesizing comprehensive task result...');
  const mockOutputs = {
    'weatherapi.forecast.list': {
      location: { name: 'Tokyo', country: 'Japan' },
      current: { temp_c: 18.5, condition: { text: 'Clear Sky' } },
    },
    'notion.page.create': {
      id: 'notion_page_tokyo_123',
      url: 'https://notion.so/tokyo-trip-page',
    },
  };

  plan.steps[0].status = 'completed';
  plan.steps[0].output = mockOutputs['weatherapi.forecast.list'];
  if (plan.steps[1]) {
    plan.steps[1].status = 'completed';
    plan.steps[1].output = mockOutputs['notion.page.create'];
  }

  const result = await synthesizeTaskResult(userPrompt, goal, plan, mockOutputs);
  console.log(`  - Executive Summary: ${result.summary}`);
  console.log(`  - Markdown Length: ${result.markdown.length} characters`);
  console.log(`  - Actions Audited: ${result.actionsTaken.length}`);

  if (!result.markdown || result.markdown.length < 50) {
    throw new Error('Result markdown output too short or empty');
  }

  console.log('\n✅ PASSED: Gemini general-purpose goal analysis, planning, and synthesis verified.\n');
}

testGemini().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
