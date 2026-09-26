import { runAutonomousAgentWorkflow } from '../server/workflow.js';
import { analyzeGoalAndRequirements } from '../server/gemini.js';

async function testLiveUserPrompt() {
  console.log('\n========================================================================');
  console.log('🧪 LIVE TEST: Multi-Provider Email + Drive + Notion + Resend Pipeline');
  console.log('========================================================================\n');

  const userPrompt = 'go thorugh my mails find the recent 10 and also find the swytchcode doc from google drive that was shared to me and then make a notion doc about the recent 10 mails and mail me the summary of the swytchcode hackathon doc';

  console.log(`Prompt: "${userPrompt}"\n`);

  // Step 1: Analyze Goal
  console.log('1. Analyzing goal & providers...');
  const goal = await analyzeGoalAndRequirements(userPrompt);
  console.log(`   - Goal: "${goal.goal}"`);
  console.log(`   - Category: ${goal.intentCategory}`);
  console.log(`   - Providers: [${goal.requiredCapabilities.join(', ')}]`);

  // Step 2: Run Workflow
  console.log('\n2. Executing multi-step workflow via Swytchcode kernel...');
  const response = await runAutonomousAgentWorkflow(
    userPrompt,
    {
      autoApproveSideEffects: true,
      bypassAuth: true,
      onEvent: (event) => {
        console.log(`   [Workflow Event] ${event.step}: ${event.status} - ${event.message}`);
      },
    }
  );

  console.log('\n3. Workflow Execution Result:');
  console.log(`   - Status: ${response.status}`);
  console.log(`   - Completed Steps: ${response.plan?.steps?.filter(s => s.status === 'completed').length || 0}/${response.plan?.steps?.length || 0}`);
  
  if (response.plan?.steps) {
    for (const step of response.plan.steps) {
      console.log(`     [Step ${step.order}] ${step.canonicalId} (${step.integrationName}): ${step.status} (latency: ${step.latencyMs}ms)`);
    }
  }

  console.log('\n4. Artifacts Produced:');
  if (response.taskResult?.artifacts && response.taskResult.artifacts.length > 0) {
    for (const art of response.taskResult.artifacts) {
      console.log(`   - [${art.type.toUpperCase()}] ${art.title} -> ${art.url}`);
    }
  } else {
    console.log('   (No artifacts extracted)');
  }

  console.log('\n5. Executive Markdown Briefing Summary:');
  console.log(response.taskResult?.markdown || response.error || 'No briefing returned');

  console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');
}

testLiveUserPrompt().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
