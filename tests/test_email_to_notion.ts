import { runAutonomousAgentWorkflow } from '../server/workflow.js';

async function testEmailToNotion() {
  console.log('\n======================================================');
  console.log('Testing End-to-End: Summarize Latest 10 Emails -> Create Notion Doc');
  console.log('======================================================\n');

  const prompt = 'summarize the latest 10 mails i got and make a doc on notion';
  const res = await runAutonomousAgentWorkflow(prompt, {
    autoApproveSideEffects: true, // auto-approve so it creates the live Notion page
    bypassAuth: true,
  });

  console.log('Workflow Status:', res.status);
  console.log('Plan Steps:', res.plan?.steps.length);
  if (res.plan) {
    for (const s of res.plan.steps) {
      console.log(`- [Step ${s.order}] ${s.canonicalId} (${s.action}) -> Status: ${s.status}`);
      if (s.output) {
        console.log(`   Output:`, JSON.stringify(s.output).substring(0, 150) + '...');
      }
      if (s.error) {
        console.log(`   Error:`, s.error);
      }
    }
  }

  if (res.taskResult) {
    console.log('\n🎉 Task Result Summary:\n', res.taskResult.summary);
  }
}

testEmailToNotion().catch(console.error);
