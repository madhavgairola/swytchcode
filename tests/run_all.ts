import { spawnSync } from 'child_process';
import path from 'path';

interface TestResult {
  name: string;
  command: string;
  status: 'PASSED' | 'FAILED';
  durationMs: number;
  output?: string;
  error?: string;
}

const tests = [
  { name: '1. Swytchcode Multi-Domain Dynamic Discovery', file: 'tests/swytchcode_discovery.test.ts' },
  { name: '2. Tooling Registration & Input Validation', file: 'tests/method_validation.test.ts' },
  { name: '3. Swytchcode Kernel Multi-Tool Execution', file: 'tests/tool_execution.test.ts' },
  { name: '4. Gemini Goal Reasoning & Plan Synthesis', file: 'tests/gemini_reasoning.test.ts' },
  { name: '5. Consequential Action Gating & Human Confirmation', file: 'tests/confirmation_gating.test.ts' },
  { name: '6. Error Handling & Security Allowlist', file: 'tests/error_handling.test.ts' },
  { name: '7. Dynamic Missing Info Forms & 3-Tool Context Chaining', file: 'tests/full_agent_capabilities.test.ts' },
  { name: '8. Autonomous Looping Sync & Multi-Stage Filter Engine', file: 'tests/sync_and_filter_agent.test.ts' },
  { name: '9. All 7 AI Assistants Integration (Gmail, Slack, Notion, GDrive, Box, GitHub, Calendar)', file: 'tests/assistants_integration.test.ts' },
];

console.log(`\n========================================================================================`);
console.log(`🧪 SWYTCHCODE GENERAL-PURPOSE AUTONOMOUS ACTION AGENT - COMPREHENSIVE TEST SUITE`);
console.log(`========================================================================================\n`);

const results: TestResult[] = [];
let allPassed = true;

for (const t of tests) {
  process.stdout.write(`⏳ Running: ${t.name}... `);
  const start = Date.now();

  const res = spawnSync('npx', ['tsx', t.file], {
    cwd: path.resolve(process.cwd()),
    encoding: 'utf8',
    shell: true,
  });

  const durationMs = Date.now() - start;

  if (res.status === 0) {
    console.log(`✅ PASSED (${durationMs}ms)`);
    results.push({
      name: t.name,
      command: `npx tsx ${t.file}`,
      status: 'PASSED',
      durationMs,
      output: res.stdout,
    });
  } else {
    console.log(`❌ FAILED (${durationMs}ms)`);
    console.error(res.stderr || res.stdout);
    allPassed = false;
    results.push({
      name: t.name,
      command: `npx tsx ${t.file}`,
      status: 'FAILED',
      durationMs,
      error: res.stderr || res.stdout,
    });
  }
}

console.log(`\n========================================================================================`);
console.log(`📊 TEST EXECUTION SUMMARY MATRIX`);
console.log(`========================================================================================`);
console.table(
  results.map(r => ({
    'Test Scenario': r.name,
    'Status': r.status === 'PASSED' ? '✅ PASSED' : '❌ FAILED',
    'Duration': `${r.durationMs}ms`,
  }))
);

if (!allPassed) {
  console.error('\n❌ Some tests failed. Please review output above.');
  process.exit(1);
} else {
  console.log('\n🎉 ALL 9 TEST SUITES (27+ VERIFICATION CHECKS) PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
