import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { apiRouter } from './routes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', apiRouter);

// Start Server
app.listen(config.port, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Swytchcode AI Travel Agent Backend`);
  console.log(`📡 Server listening on http://localhost:${config.port}`);
  console.log(`🔑 Gemini Reasoning: ${config.geminiApiKey ? 'Configured' : 'Missing'}`);
  console.log(`⚡ Swytchcode Binary: ${config.swytchcodeBin}`);
  console.log(`🛡️ Execution Mode: ${config.isDemoMode ? 'Sandbox/Demo' : 'Production'}`);
  console.log(`==================================================\n`);
});
