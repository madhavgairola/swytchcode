import { discoverCapabilities } from './swytchcode.js';

async function main() {
  const queries = [
    'slack.chat.post_message',
    'slack conversations history',
    'slack message',
    'google drive files list',
    'google.drive',
    'drive files',
    'box files get',
    'box folder'
  ];

  for (const q of queries) {
    console.log(`\nQuery: "${q}"`);
    const caps = await discoverCapabilities(q);
    caps.slice(0, 5).forEach(c => {
      console.log(` - [${c.canonical_id}] (${c.library}) : ${c.summary}`);
    });
  }
}

main().catch(console.error);
