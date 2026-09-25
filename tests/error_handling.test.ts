import { runAutonomousAgentWorkflow } from '../server/workflow.js';
import { validateMethodAgainstTooling, validateAndFormatMethodInputs } from '../server/validator.js';

async function testErrorHandling() {
  console.log('--- TEST 6: Error Handling & Security Boundary Tests ---');

  // 1. Test unverified method ID security validation
  console.log('\n[1/3] Testing unregistered method ID rejection...');
  const invalidMethodRes = validateMethodAgainstTooling('unregistered.dangerous.action');
  if (invalidMethodRes.isValid) {
    throw new Error('Expected validation failure for unregistered method ID');
  }
  console.log(`  -> Correctly rejected: "${invalidMethodRes.reason}"`);

  // 2. Test invalid input arguments validation
  console.log('\n[2/3] Testing invalid input arguments validation...');
  const invalidWeatherArgs = validateAndFormatMethodInputs('weatherapi.forecast.list', { q: '' });
  if (invalidWeatherArgs.isValid) {
    throw new Error('Expected validation failure for empty location query');
  }
  console.log(`  -> Correctly rejected empty location: "${invalidWeatherArgs.error}"`);

  // 3. Test full autonomous workflow resilience on brief / abstract prompt
  console.log('\n[3/3] Testing full workflow resilience on brief prompt ("weather and notes")...');
  const workflowRes = await runAutonomousAgentWorkflow('weather and notes', { autoApproveSideEffects: true, bypassAuth: true });
  console.log(`  -> Workflow executed with success=${workflowRes.success}, plan title="${workflowRes.plan?.title}"`);

  if (!workflowRes.plan || workflowRes.plan.steps.length === 0) {
    throw new Error('Workflow failed to construct a valid plan on brief prompt');
  }

  console.log('\n✅ PASSED: Error handling, parameter boundaries, and security policies verified.\n');
}

testErrorHandling().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
