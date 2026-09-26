import { spawn } from 'child_process';
import { config } from '../server/config.js';

async function testDriveAndGmail() {
  for (const tool of ['drive.file.list', 'gmail.user.threads.get']) {
    console.log(`\n========================================`);
    console.log(`Testing tool: ${tool} using CLI credentials`);
    console.log(`========================================`);

    const env = { ...process.env };
    delete env.SWYTCHCODE_TOKEN; // Do not pass stale SWYTCHCODE_TOKEN!

    const proc = spawn(config.swytchcodeBin, ['exec', '--json'], {
      cwd: config.projectRoot,
      env: {
        ...env,
        SWYTCHCODE_MODE: 'production',
      },
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);

    await new Promise<void>((resolve) => {
      proc.on('close', code => {
        console.log(`Exit Code: ${code}`);
        if (code === 0) {
          console.log(`✅ SUCCESS:`, stdout.substring(0, 200));
        } else {
          console.log(`❌ FAILED:`, stderr || stdout);
        }
        resolve();
      });

      const payload = tool === 'drive.file.list' 
        ? { tool, args: { params: { pageSize: 2 } } }
        : { tool, args: { params: { userId: 'me', maxResults: 2 } } };

      proc.stdin.write(JSON.stringify(payload));
      proc.stdin.end();
    });
  }
}

testDriveAndGmail().catch(console.error);
