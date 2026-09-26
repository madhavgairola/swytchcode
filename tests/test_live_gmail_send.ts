import { executeSwytchcodeMethod } from '../server/swytchcode.js';

async function testLiveGmailSend() {
  console.log('Testing live Gmail send via Swytchcode...');

  const recipient = 'madhavgairola05@gmail.com';
  const subject = 'Swytchcode Hackathon Document Summary & Workspace Briefing';
  const bodyText = `Hi Madhav,

Here is the summary of the Swytchcode Hackathon Document from your Google Drive:

📄 Build with Swytchcode | Participant Guide:
• Direct Link: https://docs.google.com/document/d/1UzaMkKO2xcrt5jIYkKm3GWzSQKEgyNJ1Eo2O3e0JTzY/edit?usp=drivesdk
• Owner: Abdullah Shahid (abdullah@swytchcode.com)
• Highlights: Complete participant briefing including hackathon schedule, Swytchcode SDK integration endpoints, project evaluation criteria, and presentation schedule.

📑 Notion Workspace Intelligence Briefing:
• Created Document URL: https://app.notion.com/p/Executive-Mailbox-Intelligence-Briefing-3e7e6d4eca8d818b8997fe4143e25c6f

Dispatched autonomously by Swytchcode Agent Kernel.`;

  const rawMessage = [
    `To: ${recipient}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
    '',
    bodyText,
  ].join('\r\n');

  const base64Raw = Buffer.from(rawMessage, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const result = await executeSwytchcodeMethod('gmail.user.send.create1', {
    params: { userId: 'me' },
    body: {
      raw: base64Raw,
    },
  });

  console.log('Gmail Send Result:', JSON.stringify(result, null, 2));
}

testLiveGmailSend().catch(console.error);
