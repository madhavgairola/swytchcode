import { discoverCapabilities } from './swytchcode.js';

async function main() {
  const assistants = [
    { name: 'Gmail Assistant', query: 'gmail send email search read threads messages' },
    { name: 'Slack Assistant', query: 'slack send message channel list history post chat' },
    { name: 'Notion Assistant', query: 'notion create page search database update block' },
    { name: 'Google Drive Assistant', query: 'google drive search list files upload download create folder' },
    { name: 'Box Assistant', query: 'box storage get file upload folder download share' },
  ];

  for (const a of assistants) {
    console.log(`\n========================================`);
    console.log(`🔍 Discovering capabilities for: ${a.name}`);
    console.log(`Query: "${a.query}"`);
    console.log(`========================================`);
    const caps = await discoverCapabilities(a.query);
    console.log(`Found ${caps.length} capabilities:`);
    caps.slice(0, 10).forEach(c => {
      console.log(` - [${c.canonical_id}] (${c.library}) : ${c.summary}`);
    });
  }
}

main().catch(console.error);
