import { runAutonomousAgentWorkflow } from '../server/workflow.js';
import { config } from '../server/config.js';

async function testConfirmationGating() {
  console.log('--- TEST 5: Consequential Action Gating & Human Confirmation Suite ---');

  const emailPrompt = 'Send a notification email to team@swytchcode.dev regarding sprint completion.';
  console.log(`Testing action gating for: "${emailPrompt}"...`);

  // Temporarily force non-demo mode for safety verification test
  const originalMode = config.isDemoMode;
  (config as any).isDemoMode = false;

  try {
    // 1. First run without pre-approval (Should yield awaiting_confirmation)
    console.log('\n[Phase 1] Executing without pre-approval (Expected: Confirmation Request)...');
    const gatedResult = await runAutonomousAgentWorkflow(emailPrompt, {
      autoApproveSideEffects: false,
    });

    console.log(`  -> Success: ${gatedResult.success}`);
    console.log(`  -> Has Confirmation Request: ${!!gatedResult.confirmationRequest}`);
    if (gatedResult.confirmationRequest) {
      console.log(`  -> Confirmation ID: ${gatedResult.confirmationRequest.confirmationId}`);
      console.log(`  -> Action Description: ${gatedResult.confirmationRequest.actionDescription}`);
      console.log(`  -> Target: ${gatedResult.confirmationRequest.targetResource}`);
    }

    if (!gatedResult.confirmationRequest) {
      throw new Error('Expected workflow to yield confirmationRequest for side-effecting action');
    }

    const confId = gatedResult.confirmationRequest.confirmationId;

    // 2. Second run with user approval / auto-approve (Should execute to completion)
    console.log('\n[Phase 2] Executing with user confirmation approval...');
    const approvedResult = await runAutonomousAgentWorkflow(emailPrompt, {
      autoApproveSideEffects: true,
      preApprovedConfirmationId: confId,
    });

    console.log(`  -> Success: ${approvedResult.success}`);
    console.log(`  -> Has Task Result: ${!!approvedResult.taskResult}`);
    console.log(`  -> Actions Taken: ${approvedResult.taskResult?.actionsTaken.length}`);

    if (!approvedResult.success || !approvedResult.taskResult) {
      throw new Error('Expected approved workflow to execute and synthesize task result');
    }

    console.log('\n✅ PASSED: Consequential action gating and confirmation lifecycle verified.\n');
  } finally {
    (config as any).isDemoMode = originalMode;
  }
}

testConfirmationGating().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
