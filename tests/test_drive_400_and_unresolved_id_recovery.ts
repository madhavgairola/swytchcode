import { startOrResumeWorkflow } from '../server/workflow.js';

async function testDriveRecovery() {
  console.log('\n========================================================================================');
  console.log('🧪 TESTING GOOGLE DRIVE 400 QUERY & UNRESOLVED TEMPLATE {{steps[0].output.fileId}} RECOVERY');
  console.log('========================================================================================\n');

  // Prompt that prompts drive search and get
  const prompt = "find the swytchcode hackathon document from google drive, summarize it in notion, and email me the summary";

  const response = await startOrResumeWorkflow(prompt, {
    autoApproveSideEffects: true,
    bypassAuth: true,
    onEvent: (event) => {
      console.log(`[Event ${event.step}] (${event.status}): ${event.message}`);
    },
  });

  console.log('\n========================================================================================');
  console.log('Workflow Status:', response.status);
  console.log('Task Result Summary:\n', response.taskResult?.summary);
  console.log('\nTASK RESULT MARKDOWN:\n', response.taskResult?.markdown);
  console.log('========================================================================================\n');

  if (response.status !== 'COMPLETED') {
    throw new Error(`Workflow did not complete successfully. Status: ${response.status}, Error: ${response.error}`);
  }

  console.log('🎉 TEST PASSED: Google Drive 400 query and unresolved template ID successfully recovered and executed live!');
}

testDriveRecovery().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
