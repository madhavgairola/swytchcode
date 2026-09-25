import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import {
  startOrResumeWorkflow,
  resumeWorkflowWithInputs,
  resumeWorkflowWithConfirmation,
  resumeWorkflowWithAuth,
} from './workflow.js';
import { workflowStore } from './workflowStore.js';
import { discoverCapabilities, runSwytchcodeCli } from './swytchcode.js';
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
    swytchcodeTokenConfigured: !!config.swytchcodeToken,
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
 * Check Swytchcode provider authentication status
 */
apiRouter.get('/auth/status', async (req: Request, res: Response) => {
  try {
    const { stdout, stderr, exitCode } = await runSwytchcodeCli(['auth', 'status']);
    res.json({
      success: exitCode === 0,
      output: stdout.trim(),
      raw: stdout,
      error: stderr,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Capability discovery endpoint
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
 * Main Chat Endpoint with Server-Sent Events (SSE) streaming
 */
apiRouter.post('/chat', async (req: Request, res: Response) => {
  const { message, stream, autoApproveSideEffects, workflowId } = req.body;

  if ((!message || typeof message !== 'string' || !message.trim()) && !workflowId) {
    return res.status(400).json({
      success: false,
      error: 'A valid message or workflowId is required.',
    });
  }

  // Handle SSE Streaming
  if (stream || req.headers.accept === 'text/event-stream') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const handleEvent = (event: WorkflowEvent) => {
      res.write(`data: ${JSON.stringify({ type: 'step', event })}\n\n`);
    };

    try {
      const existingState = workflowId ? workflowStore.get(workflowId) : undefined;
      const target = existingState || message;

      const result = await startOrResumeWorkflow(target, {
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
    const existingState = workflowId ? workflowStore.get(workflowId) : undefined;
    const target = existingState || message;

    const result = await startOrResumeWorkflow(target, {
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
 * Retrieve current state of a workflow
 */
apiRouter.get('/workflow/:id', (req: Request, res: Response) => {
  const workflowId = String(req.params.id);
  const workflow = workflowStore.get(workflowId);
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found.' });
  }
  res.json({ success: true, workflow });
});

/**
 * SSE Subscription for reconnecting to a workflow
 */
apiRouter.get('/workflow/:id/events', (req: Request, res: Response) => {
  const workflowId = String(req.params.id);
  const state = workflowStore.get(workflowId);

  if (!state) {
    return res.status(404).json({ success: false, error: 'Workflow not found.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial snapshot
  res.write(`data: ${JSON.stringify({ type: 'snapshot', state })}\n\n`);

  const unsubscribe = workflowStore.subscribe(workflowId, (updatedState, newEvent) => {
    if (newEvent) {
      res.write(`data: ${JSON.stringify({ type: 'step', event: newEvent })}\n\n`);
    }
    if (updatedState.status === 'COMPLETED' || updatedState.status === 'FAILED' || updatedState.status === 'CANCELLED') {
      res.write(`data: ${JSON.stringify({ type: 'result', result: updatedState })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

/**
 * Submit missing input form fields and resume workflow
 */
apiRouter.post('/workflow/:id/submit-input', async (req: Request, res: Response) => {
  const { inputValues } = req.body;
  const workflowId = String(req.params.id);

  if (!inputValues || typeof inputValues !== 'object') {
    return res.status(400).json({ success: false, error: 'inputValues object is required.' });
  }

  try {
    const result = await resumeWorkflowWithInputs(workflowId, inputValues);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Approve or decline consequential action confirmation
 */
apiRouter.post('/workflow/:id/confirm', async (req: Request, res: Response) => {
  const { approved } = req.body;
  const workflowId = String(req.params.id);

  try {
    const result = await resumeWorkflowWithConfirmation(workflowId, Boolean(approved));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Verify authentication status and resume workflow
 */
apiRouter.post('/workflow/:id/verify-auth', async (req: Request, res: Response) => {
  const workflowId = String(req.params.id);

  try {
    const result = await resumeWorkflowWithAuth(workflowId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Cancel an active or paused workflow
 */
apiRouter.post('/workflow/:id/cancel', (req: Request, res: Response) => {
  const workflowId = String(req.params.id);
  const state = workflowStore.cancel(workflowId);
  if (!state) {
    return res.status(404).json({ success: false, error: 'Workflow not found.' });
  }
  res.json({ success: true, status: 'CANCELLED', state });
});
