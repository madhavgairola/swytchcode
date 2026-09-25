import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { runAutonomousAgentWorkflow } from './workflow.js';
import { discoverCapabilities } from './swytchcode.js';
import { WorkflowEvent } from './types.js';

export const apiRouter = Router();

/**
 * Health check endpoint
 */
apiRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!config.geminiApiKey,
    weatherKeyConfigured: !!config.weatherApiKey,
    swytchcodeBin: config.swytchcodeBin,
    mode: config.isDemoMode ? 'sandbox' : 'production',
  });
});

/**
 * List locally available and registered Swytchcode tools
 */
apiRouter.get('/tools', (req: Request, res: Response) => {
  try {
    const toolingPath = path.join(config.projectRoot, '.swytchcode', 'tooling.json');
    if (fs.existsSync(toolingPath)) {
      const data = JSON.parse(fs.readFileSync(toolingPath, 'utf8'));
      return res.json({
        success: true,
        tools: data.tools || {},
        integrations: data.integrations || {},
        mode: data.mode || 'sandbox',
      });
    }
    return res.json({ success: true, tools: {}, integrations: {}, mode: 'sandbox' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Direct capability discovery endpoint
 */
apiRouter.get('/discover', async (req: Request, res: Response) => {
  const query = String(req.query.q || 'weather forecast');
  try {
    const capabilities = await discoverCapabilities(query);
    res.json({ success: true, query, capabilities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Main Chat Endpoint with optional Server-Sent Events (SSE) streaming
 */
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, stream, autoApproveSideEffects } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: 'A valid non-empty message is required.',
    });
  }

  // Handle SSE Streaming if requested
  if (stream || req.headers.accept === 'text/event-stream') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const handleEvent = (event: WorkflowEvent) => {
      res.write(`data: ${JSON.stringify({ type: 'step', event })}\n\n`);
    };

    try {
      const result = await runAutonomousAgentWorkflow(message, {
        autoApproveSideEffects: Boolean(autoApproveSideEffects),
        onEvent: handleEvent,
      });
      res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      return res.end();
    }
  }

  // Standard JSON response
  try {
    const result = await runAutonomousAgentWorkflow(message, {
      autoApproveSideEffects: Boolean(autoApproveSideEffects),
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error',
    });
  }
});

/**
 * Confirmation Endpoint: approves or rejects a pending consequential action
 */
apiRouter.post('/confirm', async (req: Request, res: Response) => {
  const { message, confirmationId, approved } = req.body;

  if (!message || !confirmationId) {
    return res.status(400).json({
      success: false,
      error: 'message and confirmationId are required.',
    });
  }

  if (!approved) {
    return res.json({
      success: true,
      message: 'Consequential action was declined by user. Execution halted.',
      status: 'rejected',
    });
  }

  try {
    const result = await runAutonomousAgentWorkflow(message, {
      autoApproveSideEffects: true,
      preApprovedConfirmationId: confirmationId,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Execution error after confirmation',
    });
  }
});
