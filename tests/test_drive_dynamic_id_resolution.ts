import { startOrResumeWorkflow } from '../server/workflow.js';

async function testDynamicFileIdResolution() {
  console.log('\n========================================================================================');
  console.log('🧪 TESTING DYNAMIC FILE ID RESOLUTION AND CONTEXT BINDING IN WORKFLOW');
  console.log('========================================================================================\n');

  const prompt = 'go thorugh my mails find the recent 10 and also find the swytchcode doc from google drive that was shared to me and then make a notion doc about the recent 10 mails and mail me the summary of the swytchcode hackathon doc';

  console.log(`Prompt: "${prompt}"`);

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
  console.log('\nArtifacts Count:', response.taskResult?.artifacts?.length);
  if (response.taskResult?.artifacts) {
    response.taskResult.artifacts.forEach(a => console.log(` - [${a.type}] ${a.title} -> ${a.url}`));
  }
  console.log('========================================================================================\n');

  if (response.status !== 'COMPLETED') {
    throw new Error(`Workflow did not complete successfully. Status: ${response.status}, Error: ${response.error}`);
  }

  console.log('🎉 TEST PASSED: End-to-end multi-step workflow with dynamic Drive file ID resolution succeeded without 404 target_file_id error!');
}

testDynamicFileIdResolution().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
