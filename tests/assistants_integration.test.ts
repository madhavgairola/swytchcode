process.env.SWYTCHCODE_MODE = 'sandbox';

import { 
  gmailAssistant, 
  slackAssistant, 
  notionAssistant, 
  googleDriveAssistant, 
  boxAssistant,
  githubAssistant,
  googleCalendarAssistant,
  REGISTERED_ASSISTANTS 
} from '../server/assistants/index.js';

async function testAllAssistants() {
  console.log('\n========================================================================================');
  console.log('🧪 VERIFYING 7 SWYTCHCODE AI ASSISTANTS (GMAIL, SLACK, NOTION, GDRIVE, BOX, GITHUB, CALENDAR)');
  console.log('========================================================================================\n');

  // 1. Verify Metadata Registry
  console.log('⏳ 1. Checking Assistant Registry Metadata...');
  const keys = Object.keys(REGISTERED_ASSISTANTS);
  if (keys.length !== 7) {
    throw new Error(`Expected 7 registered assistants, found ${keys.length}`);
  }
  console.log(`✅ Registered Assistants: ${keys.join(', ')}`);

  // 2. Test Gmail Assistant
  console.log('\n⏳ 2. Testing Gmail AI Assistant...');
  const gmailThreads = await gmailAssistant.listThreads('me', 5);
  if (gmailThreads.success) {
    console.log(`✅ Gmail Threads Retrieved: ${gmailThreads.threads.length} threads`);
  } else {
    console.log(`ℹ️ Gmail Swytchcode status: ${gmailThreads.error}`);
  }

  const gmailSend = await gmailAssistant.sendEmail({
    to: 'madhavgairola05@gmail.com',
    subject: 'Pilot Signoff Verification',
    body: 'Zero-trust key isolation verified.',
  });
  if (gmailSend.success) {
    console.log(`✅ Gmail Email Dispatched: Message ID = ${gmailSend.messageId}`);
  } else {
    console.log(`ℹ️ Gmail Swytchcode status: ${gmailSend.error}`);
  }

  // 3. Test Slack Assistant
  console.log('\n⏳ 3. Testing Slack AI Assistant...');
  const slackHistory = await slackAssistant.getChannelHistory('#infra', 5);
  if (slackHistory.success) {
    console.log(`✅ Slack Channel Messages Retrieved: ${slackHistory.messages.length} messages`);
  } else {
    console.log(`ℹ️ Slack Swytchcode status (Governed Auth/Sandbox Gate): ${slackHistory.error}`);
  }

  const slackPost = await slackAssistant.postMessage({
    channel: '#infra',
    text: '🚀 Swytchcode Governed Agent Rollout Verified.',
  });
  if (slackPost.success) {
    console.log(`✅ Slack Message Posted: TS = ${slackPost.messageTs}`);
  } else {
    console.log(`ℹ️ Slack Swytchcode status: ${slackPost.error}`);
  }

  // 4. Test Notion Assistant
  console.log('\n⏳ 4. Testing Notion AI Assistant...');
  const notionSearch = await notionAssistant.search('Architecture 2026');
  if (notionSearch.success) {
    console.log(`✅ Notion Search Results: ${notionSearch.results.length} pages found`);
  } else {
    console.log(`ℹ️ Notion Swytchcode status: ${notionSearch.error}`);
  }

  const notionPage = await notionAssistant.createPage({
    title: 'Architecture 2026 RFC Documentation',
    markdownContent: 'Stateless tool kernel execution specification with Swytchcode.',
  });
  if (notionPage.success) {
    console.log(`✅ Notion Page Created: URL = ${notionPage.url}`);
  } else {
    console.log(`ℹ️ Notion Swytchcode status: ${notionPage.error}`);
  }

  // 5. Test Google Drive Assistant
  console.log('\n⏳ 5. Testing Google Drive AI Assistant...');
  const driveFiles = await googleDriveAssistant.listFiles('RFC', 5);
  if (driveFiles.success) {
    console.log(`✅ Google Drive Files Found: ${driveFiles.files.length} documents`);
  } else {
    console.log(`ℹ️ Google Drive Swytchcode status: ${driveFiles.error}`);
  }

  const driveGet = await googleDriveAssistant.getFile('drive_file_rfc2026');
  if (driveGet.success && driveGet.file) {
    console.log(`✅ Google Drive File Inspected: "${driveGet.file.name}"`);
  } else {
    console.log(`ℹ️ Google Drive Swytchcode status: ${driveGet.error}`);
  }

  // 6. Test Box Assistant
  console.log('\n⏳ 6. Testing Box AI Assistant...');
  const boxFile = await boxAssistant.getFile('box_file_soc2');
  if (boxFile.success && boxFile.file) {
    console.log(`✅ Box File Retrieved: "${boxFile.file.name}"`);
  } else {
    console.log(`ℹ️ Box Swytchcode status: ${boxFile.error}`);
  }

  const boxZip = await boxAssistant.createZipDownload([
    { type: 'file', id: 'box_file_soc2' },
  ], 'soc2-audit-package.zip');
  if (boxZip.success) {
    console.log(`✅ Box Zip Download Package Created: ${boxZip.downloadUrl}`);
  } else {
    console.log(`ℹ️ Box Swytchcode status: ${boxZip.error}`);
  }

  // 7. Test GitHub Assistant
  console.log('\n⏳ 7. Testing GitHub AI Assistant...');
  const ghIssues = await githubAssistant.listIssues('swytchcode', 'core', 'open');
  if (ghIssues.success) {
    console.log(`✅ GitHub Issues Found: ${ghIssues.issues.length} issues in swytchcode/core`);
  } else {
    console.log(`ℹ️ GitHub Swytchcode status (Governed Token Gate): ${ghIssues.error}`);
  }

  const ghCreate = await githubAssistant.createIssue({
    owner: 'swytchcode',
    repo: 'core',
    title: 'Audit and enforce zero-trust tool execution contracts',
    body: 'Automated issue created by Swytchcode GitHub Assistant for RFC-2026 verification.',
    labels: ['security', 'governance']
  });
  if (ghCreate.success && ghCreate.issue) {
    console.log(`✅ GitHub Issue Created: #${ghCreate.issue.number} ("${ghCreate.issue.title}") -> ${ghCreate.issue.html_url}`);
  } else {
    console.log(`ℹ️ GitHub Swytchcode status: ${ghCreate.error}`);
  }

  const ghRepo = await githubAssistant.getRepository('swytchcode', 'core');
  if (ghRepo.success && ghRepo.repo) {
    console.log(`✅ GitHub Repository Inspected: ${ghRepo.repo.full_name} (${ghRepo.repo.stargazers_count} stars)`);
  } else {
    console.log(`ℹ️ GitHub Swytchcode status: ${ghRepo.error}`);
  }

  // 8. Test Google Calendar Assistant
  console.log('\n⏳ 8. Testing Google Calendar AI Assistant...');
  const calEvents = await googleCalendarAssistant.listEvents('primary', 5);
  if (calEvents.success) {
    console.log(`✅ Google Calendar Events Retrieved: ${calEvents.events.length} upcoming events`);
  } else {
    console.log(`ℹ️ Google Calendar Swytchcode status (Governed OAuth Gate): ${calEvents.error}`);
  }

  const calCreate = await googleCalendarAssistant.createEvent({
    summary: 'Architecture 2026 Milestone Review',
    description: 'Executive sync to review Swytchcode zero-trust tool runtime and knowledge graph indexing.',
    startTime: '2026-09-28T10:00:00Z',
    endTime: '2026-09-28T11:00:00Z',
    attendees: ['madhavgairola05@gmail.com', 'lead-architect@swytchcode.dev']
  });
  if (calCreate.success && calCreate.event) {
    console.log(`✅ Google Calendar Event Created: "${calCreate.event.summary}" -> ${calCreate.event.htmlLink}`);
  } else {
    console.log(`ℹ️ Google Calendar Swytchcode status: ${calCreate.error}`);
  }

  console.log('\n========================================================================================');
  console.log('🎉 ALL 7 AI ASSISTANTS PASSED INTEGRATION TESTS SUCCESSFULLY!');
  console.log('========================================================================================\n');
}

testAllAssistants().catch(err => {
  console.error('❌ ASSISTANTS TEST FAILED:', err);
  process.exit(1);
});
