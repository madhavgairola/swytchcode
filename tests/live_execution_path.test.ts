import { executeToolWithRetry } from '../server/executor.js';
import { startOrResumeWorkflow } from '../server/workflow.js';

async function verifyLiveExecutionPath() {
  console.log('================================================================');
  console.log('🔍 VERIFYING REAL PRODUCTION SWYTCHCODE EXECUTION PATH');
  console.log('================================================================\n');

  // 1. Test Direct Swytchcode Execution Path for Google Drive
  console.log('⏳ 1. Executing Google Drive (drive.file.list)...');
  const driveRes = await executeToolWithRetry('drive.file.list', { params: { pageSize: 5 } });
  console.log('Drive Success:', driveRes.success);
  console.log('Drive IsMocked:', driveRes.isMocked);
  console.log('Drive Latency:', `${driveRes.latencyMs}ms`);
  if (!driveRes.success || driveRes.isMocked) {
    throw new Error(`Drive execution failed or returned mock: ${driveRes.error}`);
  }
  console.log('✅ Google Drive live production call verified.\n');

  // 2. Test Direct Swytchcode Execution Path for Gmail
  console.log('⏳ 2. Executing Gmail (gmail.user.threads.get)...');
  const gmailRes = await executeToolWithRetry('gmail.user.threads.get', { params: { userId: 'me', maxResults: 3 } });
  console.log('Gmail Success:', gmailRes.success);
  console.log('Gmail IsMocked:', gmailRes.isMocked);
  console.log('Gmail Latency:', `${gmailRes.latencyMs}ms`);
  if (!gmailRes.success || gmailRes.isMocked) {
    throw new Error(`Gmail execution failed or returned mock: ${gmailRes.error}`);
  }
  console.log('✅ Gmail live production call verified.\n');

  // 3. Test Direct Swytchcode Execution Path for Notion
  console.log('⏳ 3. Executing Notion (notion.search.create)...');
  const notionRes = await executeToolWithRetry('notion.search.create', { body: { query: '' } });
  console.log('Notion Success:', notionRes.success);
  console.log('Notion IsMocked:', notionRes.isMocked);
  console.log('Notion Latency:', `${notionRes.latencyMs}ms`);
  if (!notionRes.success || notionRes.isMocked) {
    throw new Error(`Notion execution failed or returned mock: ${notionRes.error}`);
  }
  console.log('✅ Notion live production call verified.\n');

  // 4. Test Full Workflow Pipeline for "List my Google Drive files."
  console.log('⏳ 4. Executing Full Workflow Pipeline for "List my Google Drive files."...');
  const workflowRes = await startOrResumeWorkflow('List my Google Drive files.');
  console.log('Workflow Status:', workflowRes.status);
  console.log('Workflow Step Count:', workflowRes.plan?.steps.length);
  console.log('Workflow Executed Canonical ID:', workflowRes.plan?.steps[0]?.canonicalId);
  console.log('Workflow Step IsMocked:', workflowRes.plan?.steps[0]?.isMocked);
  if (workflowRes.status !== 'COMPLETED' || workflowRes.plan?.steps[0]?.canonicalId !== 'drive.file.list' || workflowRes.plan?.steps[0]?.isMocked) {
    throw new Error(`Workflow pipeline failed or returned mock`);
  }
  console.log('✅ Full Workflow Pipeline executed live in production!\n');

  console.log('================================================================');
  console.log('🎉 ALL PRODUCTION SWYTCHCODE EXECUTIONS VERIFIED 100% LIVE!');
  console.log('================================================================');
}

verifyLiveExecutionPath().catch(err => {
  console.error('❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
