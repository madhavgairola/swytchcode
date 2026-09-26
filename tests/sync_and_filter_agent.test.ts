import {
  evaluateItemAgainstFilters,
  normalizeDomain,
  extractEmailAddress,
  mapCategoryToKey,
} from '../server/filterEngine.js';
import { SyncFilterConfig } from '../server/types.js';
import { syncLoopAgent, DEFAULT_SYNC_CONFIG } from '../server/syncLoopAgent.js';
import { expandKeywordsWithSemantics } from '../server/gemini.js';

async function runSyncAndFilterTests() {
  console.log('\n--- Test Suite: Looping Sync Agent & Multi-Layer Filter Engine ---');

  // Test 1: Domain & Sender Normalization & Extraction
  console.log('1. Testing Domain & Sender Extraction...');
  const domain1 = normalizeDomain('@swytchcode.com');
  const domain2 = normalizeDomain('swytchcode.com');
  const email1 = extractEmailAddress('Madhav Gairola <madhav@swytchcode.com>');
  const email2 = extractEmailAddress('plain.address@gmail.com');

  if (domain1 !== 'swytchcode.com' || domain2 !== 'swytchcode.com') {
    throw new Error(`Domain normalization failed: ${domain1}, ${domain2}`);
  }
  if (email1 !== 'madhav@swytchcode.com' || email2 !== 'plain.address@gmail.com') {
    throw new Error(`Email extraction failed: ${email1}, ${email2}`);
  }
  console.log('   ✓ Domain and sender address extraction verified');

  // Test 2: Category Key Mapping
  console.log('2. Testing Category Key Mapping...');
  if (mapCategoryToKey('Social Networking') !== 'socialNetworking') throw new Error('Social Networking key mapping failed');
  if (mapCategoryToKey('Event & Conference Pass') !== 'eventConferencePass') throw new Error('Event Pass key mapping failed');
  if (mapCategoryToKey('Campus Opportunity & Circular') !== 'campusOpportunity') throw new Error('Campus Circular key mapping failed');
  if (mapCategoryToKey('Newsletter & Digest') !== 'newsletterDigest') throw new Error('Newsletter Digest key mapping failed');
  if (mapCategoryToKey('Security Alert') !== 'securityAlert') throw new Error('Security Alert key mapping failed');
  if (mapCategoryToKey('Direct Communication') !== 'directCommunication') throw new Error('Direct Communication key mapping failed');
  console.log('   ✓ All 6 taxonomy category keys mapped cleanly');

  // Test 3: Domain & Email Filtering Logic
  console.log('3. Testing Domain & Sender Whitelist/Blocklist Rules...');
  const testConfig: SyncFilterConfig = {
    ...DEFAULT_SYNC_CONFIG,
    allowedDomains: ['@swytchcode.com'],
    allowedSenders: ['trusted.partner@outside.io'],
    blockedDomains: ['spam.com'],
    categoryFilters: {
      socialNetworking: false,
      eventConferencePass: true,
      campusOpportunity: true,
      newsletterDigest: false,
      directCommunication: true,
      securityAlert: true,
    },
    keywords: [],
    semanticExpansion: false,
    minUrgencyLevel: 'ALL',
    minRelevanceScore: 0,
  };

  // Case A: Allowed Domain
  const resA = evaluateItemAgainstFilters(
    { from: 'Alex <alex@swytchcode.com>', subject: 'Sprint Sync', category: 'Direct Communication', urgency: 'LOW' },
    testConfig
  );
  if (!resA.passed) throw new Error(`Allowed domain item failed: ${resA.explanation}`);

  // Case B: Allowed Sender
  const resB = evaluateItemAgainstFilters(
    { from: 'Partner <trusted.partner@outside.io>', subject: 'Contract Review', category: 'Direct Communication', urgency: 'LOW' },
    testConfig
  );
  if (!resB.passed) throw new Error(`Allowed sender item failed: ${resB.explanation}`);

  // Case C: Unlisted Domain (should be rejected)
  const resC = evaluateItemAgainstFilters(
    { from: 'Stranger <someone@unknown-domain.com>', subject: 'Hey there', category: 'Direct Communication', urgency: 'LOW' },
    testConfig
  );
  if (resC.passed || resC.rejectReason !== 'domainFiltered') {
    throw new Error(`Unlisted domain was not filtered out: ${JSON.stringify(resC)}`);
  }

  // Case D: Blocked Domain
  const resD = evaluateItemAgainstFilters(
    { from: 'Marketing <deals@spam.com>', subject: 'Promo', category: 'Direct Communication', urgency: 'LOW' },
    { ...testConfig, allowedDomains: [] } // clear allowed to test blocklist alone
  );
  if (resD.passed || resD.rejectReason !== 'domainFiltered') {
    throw new Error(`Blocked domain was not rejected: ${JSON.stringify(resD)}`);
  }
  console.log('   ✓ Domain whitelist, sender whitelist, and blocklists verified');

  // Test 4: Category Filtering (Social & Digest suppression)
  console.log('4. Testing Category Toggles (Suppressing Social & Digest Noise)...');
  const categoryOnlyConfig: SyncFilterConfig = {
    ...testConfig,
    allowedDomains: [],
    allowedSenders: [],
  };

  const linkedInItem = {
    from: 'LinkedIn <invitations@linkedin.com>',
    subject: 'Aranav is waiting for your response',
    category: 'Social Networking',
    urgency: 'INFO' as const,
  };
  const resLinkedIn = evaluateItemAgainstFilters(linkedInItem, categoryOnlyConfig);
  if (resLinkedIn.passed || resLinkedIn.rejectReason !== 'categoryFiltered') {
    throw new Error(`Disabled category 'socialNetworking' was not rejected: ${JSON.stringify(resLinkedIn)}`);
  }

  const mediumItem = {
    from: 'Medium <digest@medium.com>',
    subject: 'Python 3.15 Is Bigger Than You Think',
    category: 'Newsletter & Digest',
    urgency: 'INFO' as const,
  };
  const resMedium = evaluateItemAgainstFilters(mediumItem, categoryOnlyConfig);
  if (resMedium.passed || resMedium.rejectReason !== 'categoryFiltered') {
    throw new Error(`Disabled category 'newsletterDigest' was not rejected: ${JSON.stringify(resMedium)}`);
  }

  // Enabling Social Networking should allow it through
  const resLinkedInAllowed = evaluateItemAgainstFilters(linkedInItem, {
    ...categoryOnlyConfig,
    categoryFilters: { ...testConfig.categoryFilters, socialNetworking: true },
  });
  if (!resLinkedInAllowed.passed) {
    throw new Error(`Explicitly enabled category was incorrectly rejected: ${resLinkedInAllowed.explanation}`);
  }
  console.log('   ✓ Category suppression and toggle inclusion verified');

  // Test 5: Keyword & AI Semantic Term Expansion
  console.log('5. Testing Keyword & AI Semantic Search Matching...');
  const keywordConfig: SyncFilterConfig = {
    ...categoryOnlyConfig,
    keywords: ['hackathon'],
    semanticExpansion: true,
  };
  const expandedTerms = ['competition', 'pass', 'submission', 'build with swytchcode'];

  // Content matching expanded term "build with swytchcode"
  const eventItem = {
    from: 'KNOTiC <passes@knotic.io>',
    subject: 'Build With Swytchcode : Gurgaon Edition Pass',
    snippet: 'You are receiving this because you filled Call for Registration',
    category: 'Event & Conference Pass',
    urgency: 'INFO' as const,
  };
  const resEvent = evaluateItemAgainstFilters(eventItem, keywordConfig, expandedTerms);
  if (!resEvent.passed) {
    throw new Error(`Keyword / semantic expansion match failed: ${resEvent.explanation}`);
  }
  if (!resEvent.matchedRules.matchedKeywords.length) {
    throw new Error('matchedKeywords array is empty');
  }
  console.log(`   ✓ Matched semantic keyword: ${resEvent.matchedRules.matchedKeywords.join(', ')}`);

  // Test 6: AI Keyword Expansion with Gemini
  console.log('6. Testing AI Keyword Expansion with Gemini...');
  const aiExpanded = await expandKeywordsWithSemantics(['hackathon', 'travel']);
  console.log(`   ✓ Gemini expanded keywords: ${JSON.stringify(aiExpanded)}`);
  if (!Array.isArray(aiExpanded) || aiExpanded.length === 0) {
    throw new Error('Gemini keyword expansion returned empty list');
  }

  // Test 7: Sync Agent Status and Dry-Run Preview
  console.log('7. Testing Sync Loop Agent & Dry-Run Preview...');
  await syncLoopAgent.updateConfig({
    enabled: true,
    intervalMinutes: 60,
    allowedDomains: [],
    categoryFilters: {
      socialNetworking: false,
      eventConferencePass: true,
      campusOpportunity: true,
      newsletterDigest: false,
      directCommunication: true,
      securityAlert: true,
    },
    keywords: [],
  });

  const preview = await syncLoopAgent.triggerSync(true);
  if (!preview.result || !Array.isArray(preview.previewItems)) {
    throw new Error('Sync dry-run preview failed to return valid structure');
  }
  console.log(`   ✓ Preview evaluated ${preview.result.totalFetched} items: ${preview.result.totalPassedFilters} passed, ${preview.result.totalRejected} rejected.`);

  console.log('\n🎉 ALL LOOPING SYNC & MULTI-LAYER FILTER TESTS PASSED SUCCESSFULLY!\n');
  syncLoopAgent.stop();
  process.exit(0);
}

runSyncAndFilterTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
