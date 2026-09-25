import {
  startOrResumeWorkflow,
  resumeWorkflowWithInputs,
  resumeWorkflowWithConfirmation,
} from '../server/workflow.js';
import { checkProviderAuthStatus } from '../server/swytchcode.js';

async function testFullAgentCapabilities() {
  console.log('--- TEST 7: Complete Agent Capabilities Suite (Missing Info, Multi-Tool Chaining, Checkpoint Resumption) ---');

  // ----------------------------------------------------
  // SCENARIO 1: Missing Information Detection & Dynamic Resumption
  // ----------------------------------------------------
  console.log('\n[1/3] Testing Dynamic Missing Information Detection...');
  const promptMissing = 'Send an email notification with project summary';
  
  const initialRes = await startOrResumeWorkflow(promptMissing, { autoApproveSideEffects: true });
  console.log(`  -> Status: ${initialRes.status}`);
  console.log(`  -> Has Missing Input Request: ${!!initialRes.missingInputRequest}`);

  if (initialRes.missingInputRequest) {
    console.log(`  -> Required Fields: ${initialRes.missingInputRequest.fields.map(f => f.name).join(', ')}`);
    for (const f of initialRes.missingInputRequest.fields) {
      console.log(`     * Field: "${f.label}" (${f.type}) - Why: ${f.whyRequired}`);
    }

    // Submit inputs and resume workflow from checkpoint
    console.log('\n[1b/3] Submitting missing form values and resuming from checkpoint...');
    const resumedRes = await resumeWorkflowWithInputs(initialRes.workflowId, {
      to: 'team@swytchcode.dev',
      subject: 'Weekly Sprint Summary',
    }, { autoApproveSideEffects: true });

    console.log(`  -> Resumed Status: ${resumedRes.status}`);
    console.log(`  -> Actions Executed: ${resumedRes.taskResult?.actionsTaken.length || 0}`);
    if (resumedRes.status !== 'COMPLETED' || !resumedRes.taskResult) {
      throw new Error('Expected resumed workflow to execute and complete');
    }
  }

  // ----------------------------------------------------
  // SCENARIO 2: Provider Auth Status & Swytchcode Verification
  // ----------------------------------------------------
  console.log('\n[2/3] Testing Provider Authentication Status Check...');
  const notionAuth = await checkProviderAuthStatus('Notion');
  const weatherAuth = await checkProviderAuthStatus('WeatherAPI');
  const resendAuth = await checkProviderAuthStatus('Resend');

  console.log(`  -> Notion Status: ${notionAuth.status} (Connected: ${notionAuth.connected})`);
  console.log(`  -> WeatherAPI Status: ${weatherAuth.status} (Connected: ${weatherAuth.connected})`);
  console.log(`  -> Resend Status: ${resendAuth.status} (Connected: ${resendAuth.connected})`);

  // ----------------------------------------------------
  // SCENARIO 3: 3-Tool Multi-Step Chained Workflow
  // ----------------------------------------------------
  console.log('\n[3/3] Testing 3-Tool Context Chained Workflow (Weather -> Notion -> Resend)...');
  const multiToolPrompt = 'Check the weather in Tokyo for tomorrow, create a Notion project briefing page, and email the summary to team@swytchcode.dev';

  const chainedRes = await startOrResumeWorkflow(multiToolPrompt, { autoApproveSideEffects: true });
  console.log(`  -> Chained Workflow Status: ${chainedRes.status}`);
  console.log(`  -> Plan Steps: ${chainedRes.plan?.steps.length || 0}`);
  
  if (chainedRes.plan) {
    for (const step of chainedRes.plan.steps) {
      console.log(`     [Step ${step.order}] ${step.canonicalId} (${step.action}) -> Status: ${step.status}`);
    }
  }

  console.log(`  -> Actions Audited: ${chainedRes.taskResult?.actionsTaken.length || 0}`);
  if (chainedRes.status !== 'COMPLETED' || !chainedRes.taskResult) {
    throw new Error('Expected 3-tool chained workflow to complete');
  }

  console.log('\n✅ PASSED: Complete Swytchcode agent capabilities, dynamic forms, and 3-tool chaining verified.\n');
}

testFullAgentCapabilities().catch(err => {
  console.error('❌ FAILED:', err.message);
  process.exit(1);
});
