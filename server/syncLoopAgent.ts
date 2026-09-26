import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { executeSwytchcodeMethod } from './swytchcode.js';
import { expandKeywordsWithSemantics, classifyBatchForSync } from './gemini.js';
import { evaluateItemAgainstFilters, EvaluatedItem } from './filterEngine.js';
import { SyncFilterConfig, SyncRunResult, SyncAgentStatus } from './types.js';

const CONFIG_FILE_PATH = path.join(config.projectRoot, '.swytchcode', 'sync_config.json');
const CACHE_FILE_PATH = path.join(config.projectRoot, '.swytchcode', 'sync_cache.json');

export const DEFAULT_SYNC_CONFIG: SyncFilterConfig = {
  enabled: true,
  intervalMinutes: 60, // 1 hour by default
  allowedDomains: [],
  allowedSenders: [],
  blockedDomains: ['promotions.com', 'spam.net'],
  categoryFilters: {
    socialNetworking: false,
    eventConferencePass: true,
    campusOpportunity: true,
    newsletterDigest: false,
    directCommunication: true,
    securityAlert: true,
  },
  keywords: [],
  semanticExpansion: true,
  expandedKeywords: [],
  minUrgencyLevel: 'ALL',
  minRelevanceScore: 50,
  sendSummaryEmail: true,
  recipientEmail: 'madhavgairola05@gmail.com',
};

class SyncLoopAgent {
  private config: SyncFilterConfig;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastSyncTimestamp: string | null = null;
  private nextSyncTimestamp: string | null = null;
  private lastRunResult: SyncRunResult | null = null;
  private totalProcessedCount: number = 0;
  private totalNodesIngested: number = 0;
  private knownIngestedIds: Set<string> = new Set();
  private listeners: Array<(result: SyncRunResult, nodes: any[], edges: any[]) => void> = [];

  constructor() {
    this.config = this.loadConfig();
    this.loadCache();
    this.scheduleTimer();
  }

  private loadConfig(): SyncFilterConfig {
    try {
      if (fs.existsSync(CONFIG_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, 'utf8'));
        return {
          ...DEFAULT_SYNC_CONFIG,
          ...data,
          categoryFilters: {
            ...DEFAULT_SYNC_CONFIG.categoryFilters,
            ...(data.categoryFilters || {}),
          },
        };
      }
    } catch (e) {
      console.warn('[SyncLoopAgent] Failed to read sync_config.json, using defaults:', e);
    }
    return { ...DEFAULT_SYNC_CONFIG };
  }

  public saveConfig(): void {
    try {
      const dir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (e) {
      console.error('[SyncLoopAgent] Error saving sync_config.json:', e);
    }
  }

  private loadCache(): void {
    try {
      if (fs.existsSync(CACHE_FILE_PATH)) {
        const data = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
        if (Array.isArray(data.knownIds)) {
          this.knownIngestedIds = new Set(data.knownIds);
        }
        this.totalNodesIngested = data.totalNodesIngested || this.knownIngestedIds.size;
        this.totalProcessedCount = data.totalProcessedCount || 0;
        this.lastSyncTimestamp = data.lastSyncTimestamp || null;
      }
    } catch (e) {
      console.warn('[SyncLoopAgent] Cache load error:', e);
    }
  }

  private saveCache(): void {
    try {
      const dir = path.dirname(CACHE_FILE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        CACHE_FILE_PATH,
        JSON.stringify(
          {
            knownIds: Array.from(this.knownIngestedIds),
            totalNodesIngested: this.totalNodesIngested,
            totalProcessedCount: this.totalProcessedCount,
            lastSyncTimestamp: this.lastSyncTimestamp,
          },
          null,
          2
        ),
        'utf8'
      );
    } catch (e) {
      console.error('[SyncLoopAgent] Error saving sync_cache.json:', e);
    }
  }

  public scheduleTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (!this.config.enabled || this.config.intervalMinutes <= 0) {
      this.nextSyncTimestamp = null;
      console.log(`[SyncLoopAgent] Scheduled background sync is DISABLED (interval = ${this.config.intervalMinutes}m).`);
      return;
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    this.nextSyncTimestamp = new Date(Date.now() + intervalMs).toISOString();

    console.log(`[SyncLoopAgent] Scheduled background sync every ${this.config.intervalMinutes} minute(s). Next run at: ${this.nextSyncTimestamp}`);

    this.timer = setInterval(() => {
      this.triggerSync(false).catch(err => {
        console.error('[SyncLoopAgent] Scheduled sync error:', err);
      });
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public subscribe(listener: (result: SyncRunResult, nodes: any[], edges: any[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public getStatus(): SyncAgentStatus {
    return {
      isRunning: this.isRunning,
      enabled: this.config.enabled && this.config.intervalMinutes > 0,
      intervalMinutes: this.config.intervalMinutes,
      lastSyncTimestamp: this.lastSyncTimestamp,
      nextSyncTimestamp: this.nextSyncTimestamp,
      totalProcessedCount: this.totalProcessedCount,
      totalNodesIngested: this.totalNodesIngested,
      lastRunResult: this.lastRunResult,
      config: this.config,
    };
  }

  public async updateConfig(updates: Partial<SyncFilterConfig>): Promise<SyncAgentStatus> {
    const keywordsChanged = updates.keywords !== undefined && 
      JSON.stringify(updates.keywords) !== JSON.stringify(this.config.keywords);

    this.config = {
      ...this.config,
      ...updates,
      categoryFilters: {
        ...this.config.categoryFilters,
        ...(updates.categoryFilters || {}),
      },
    };

    if (keywordsChanged || (updates.semanticExpansion && !this.config.expandedKeywords?.length)) {
      if (this.config.keywords.length > 0 && this.config.semanticExpansion) {
        try {
          this.config.expandedKeywords = await expandKeywordsWithSemantics(this.config.keywords);
        } catch (e) {
          console.warn('[SyncLoopAgent] Failed to expand keywords:', e);
        }
      } else {
        this.config.expandedKeywords = [];
      }
    }

    this.saveConfig();
    this.scheduleTimer();
    return this.getStatus();
  }

  /**
   * Triggers an immediate sync run (or dry-run preview)
   */
  public async triggerSync(isDryRun: boolean = false): Promise<{
    result: SyncRunResult;
    nodes: any[];
    edges: any[];
    previewItems?: Array<{ item: any; passed: boolean; reason: string }>;
  }> {
    if (this.isRunning && !isDryRun) {
      throw new Error('A sync run is already in progress.');
    }

    const startTime = Date.now();
    const runId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    if (!isDryRun) this.isRunning = true;

    try {
      console.log(`[SyncLoopAgent] Starting sync run (dryRun: ${isDryRun})...`);

      // 1. Expand keywords if not done yet
      if (this.config.semanticExpansion && this.config.keywords.length > 0 && (!this.config.expandedKeywords || this.config.expandedKeywords.length === 0)) {
        try {
          this.config.expandedKeywords = await expandKeywordsWithSemantics(this.config.keywords);
          this.saveConfig();
        } catch (e) {
          console.warn('[SyncLoopAgent] Semantic keyword expansion warning:', e);
        }
      }

      // 2. Fetch raw threads via Swytchcode
      const execResult = await executeSwytchcodeMethod('gmail.user.threads.get', {
        params: { userId: 'me', maxResults: 15 },
      });

      const rawThreads: any[] =
        execResult.data?.threads ||
        execResult.data?.data?.threads ||
        (Array.isArray(execResult.data) ? execResult.data : []);
      const totalFetched = rawThreads.length;

      // 3. Normalize raw threads to EvaluatedItems
      const normalizedItems: Array<{ id: string; from: string; subject: string; snippet: string; raw: any }> = rawThreads.map((t, idx) => {
        const id = t.id || t.threadId || `thread_${Date.now()}_${idx}`;
        const snippet = t.snippet || t.body || t.preview || '';
        const headers = t.headers || t.payload?.headers || [];
        let from = t.from || '';
        let subject = t.subject || '';

        if (Array.isArray(headers)) {
          const fromH = headers.find((h: any) => h.name?.toLowerCase() === 'from');
          const subjH = headers.find((h: any) => h.name?.toLowerCase() === 'subject');
          if (fromH?.value) from = fromH.value;
          if (subjH?.value) subject = subjH.value;
        }

        if (!from && snippet.includes('·Become a member Medium')) from = 'Medium Daily Digest <digest@medium.com>';
        if (!from && snippet.includes('DeviantArt')) from = 'DeviantArt <no-reply@deviantart.com>';
        if (!from && snippet.includes('KNOTiC')) from = 'KNOTiC Passes <passes@knotic.io>';
        if (!from && snippet.includes('Aranav')) from = 'Aranav <invitations@linkedin.com>';
        if (!from && snippet.includes('Yuva Yodha')) from = 'Campus TPO <placements@university.edu>';

        return { id, from, subject: subject || snippet.slice(0, 40), snippet, raw: t };
      });

      // 4. Batch Classify items with Gemini
      const classifications = await classifyBatchForSync(normalizedItems);
      const classificationMap = new Map(classifications.map(c => [c.id, c]));

      // 5. Evaluate each item against filter rules
      const rejectionBreakdown = {
        domainFiltered: 0,
        categoryFiltered: 0,
        keywordFiltered: 0,
        duplicate: 0,
        urgencyFiltered: 0,
      };

      const passedItems: Array<{ item: EvaluatedItem; summary: string; category: string; urgency: string }> = [];
      const previewItems: Array<{ item: any; passed: boolean; reason: string }> = [];

      normalizedItems.forEach(item => {
        const classInfo = classificationMap.get(item.id);
        const evalItem: EvaluatedItem = {
          id: item.id,
          source: 'gmail',
          from: item.from,
          subject: item.subject,
          snippet: item.snippet,
          category: classInfo?.category || 'Direct Communication',
          urgency: (classInfo?.urgency as any) || 'INFO',
        };

        // Check deduplication
        if (!isDryRun && this.knownIngestedIds.has(item.id)) {
          rejectionBreakdown.duplicate++;
          previewItems.push({ item: evalItem, passed: false, reason: 'Already indexed in Knowledge Graph' });
          return;
        }

        const evalResult = evaluateItemAgainstFilters(
          evalItem,
          this.config,
          this.config.expandedKeywords || []
        );

        if (evalResult.passed) {
          passedItems.push({
            item: evalItem,
            summary: classInfo?.summary || item.subject,
            category: evalItem.category || 'Direct Communication',
            urgency: evalItem.urgency || 'INFO',
          });
          previewItems.push({ item: evalItem, passed: true, reason: evalResult.explanation });
        } else {
          const r = evalResult.rejectReason || 'domainFiltered';
          if (r in rejectionBreakdown) {
            rejectionBreakdown[r]++;
          }
          previewItems.push({ item: evalItem, passed: false, reason: evalResult.explanation });
        }
      });

      // 6. Generate Satellite Graph Nodes & Edges for Passed Items
      const createdNodes: any[] = [];
      const createdEdges: any[] = [];
      const createdNodeLabels: string[] = [];

      if (!isDryRun && passedItems.length > 0) {
        const timestamp = new Date().toISOString();
        const actionNodeId = `sync-action-${runId}`;

        // Action Root Cluster Node for this sync run
        createdNodes.push({
          id: actionNodeId,
          label: `🔄 Auto-Sync (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
          group: 2,
          val: 8.0,
          type: 'decision',
          source: 'gmail',
          color: '#06b6d4', // cyan-500
          summary: `Autonomous knowledge base sync: ingested ${passedItems.length} filtered entities.`,
          content: `Filter Criteria: Allowed Domains: ${this.config.allowedDomains.join(', ') || 'All'}\nCategories: ${Object.entries(this.config.categoryFilters).filter(([, v]) => v).map(([k]) => k).join(', ')}`,
          timestamp,
          relevanceScore: 95,
        });

        // Link action node to central core and Gmail hub
        createdEdges.push({
          id: `e-core-${actionNodeId}`,
          source: 'hub-core',
          target: actionNodeId,
          label: 'sync_event',
          relationshipType: 'provenance',
        });
        createdEdges.push({
          id: `e-gmail-${actionNodeId}`,
          source: 'hub-gmail',
          target: actionNodeId,
          label: 'ingested',
          relationshipType: 'references',
        });

        // Satellite Nodes for each passed item
        passedItems.forEach((p, idx) => {
          const mailNodeId = `sync-mail-${runId}-${idx}`;
          const subject = p.item.subject || `Thread #${idx + 1}`;
          const shortLabel = subject.length > 26 ? subject.slice(0, 23) + '...' : subject;

          createdNodeLabels.push(shortLabel);
          this.knownIngestedIds.add(p.item.id || mailNodeId);

          createdNodes.push({
            id: mailNodeId,
            label: shortLabel,
            group: 1,
            val: 6.0,
            type: 'email',
            source: 'gmail',
            color: '#38bdf8', // sky-400
            summary: `[${p.category}] ${p.summary}`,
            content: `From: ${p.item.from || 'Unknown'}\nCategory: ${p.category}\nUrgency: ${p.urgency}\nSnippet: ${p.item.snippet || ''}`,
            timestamp,
            relevanceScore: 88,
            metadata: {
              category: p.category,
              urgency: p.urgency,
              from: p.item.from,
              threadId: p.item.id,
            },
            evidenceReferences: [
              {
                source: 'gmail',
                snippet: `[${p.category}] ${p.item.snippet || p.summary}`,
                author: p.item.from,
                date: timestamp,
              },
            ],
          });

          // Link to parent action node and hub-gmail
          createdEdges.push({
            id: `e-action-sync-${runId}-${idx}`,
            source: actionNodeId,
            target: mailNodeId,
            label: 'indexed',
            relationshipType: 'references',
          });
          createdEdges.push({
            id: `e-gmail-sync-${runId}-${idx}`,
            source: 'hub-gmail',
            target: mailNodeId,
            label: 'thread',
            relationshipType: 'references',
          });
        });

        this.totalNodesIngested += createdNodes.length;
        this.totalProcessedCount += totalFetched;
        this.lastSyncTimestamp = timestamp;
        this.saveCache();

        // If sendSummaryEmail is enabled, dispatch a clean hourly summary email via Gmail
        if (this.config.sendSummaryEmail && passedItems.length > 0) {
          try {
            const recipient = this.config.recipientEmail || 'madhavgairola05@gmail.com';
            const emailSubject = `Hourly Workspace Digest: ${passedItems.length} New Update${passedItems.length > 1 ? 's' : ''}`;
            const summaryBullets = passedItems.map((p, idx) => {
              const urgencyTag = p.urgency === 'HIGH' ? '🚨 [HIGH]' : p.urgency === 'MEDIUM' ? '⚠️ [MEDIUM]' : 'ℹ️ [INFO]';
              return `• [${p.category}] ${p.item.subject} ${urgencyTag}\n  ${p.summary}\n  Source: ${p.item.source || 'Gmail'}${p.item.from ? ` (${p.item.from})` : ''}`;
            }).join('\n\n');

            const emailBody = [
              `Hi Madhav,`,
              ``,
              `Here is your periodic workspace intelligence digest for new items discovered across your connected workspace accounts:`,
              ``,
              summaryBullets,
              ``,
              `---`,
              `Dispatched autonomously by Swytchcode Autonomous Sync Engine.`,
            ].join('\n');

            const rawMessage = [
              `To: ${recipient}`,
              `Subject: ${emailSubject}`,
              `Content-Type: text/plain; charset=utf-8`,
              `MIME-Version: 1.0`,
              '',
              emailBody,
            ].join('\r\n');

            const base64Raw = Buffer.from(rawMessage, 'utf-8')
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_')
              .replace(/=+$/, '');

            const sendResult = await executeSwytchcodeMethod('gmail.user.send.create1', {
              params: { userId: 'me' },
              body: { raw: base64Raw },
            });

            const threadId = sendResult.data?.threadId || sendResult.data?.id;
            console.log(`[SyncLoopAgent] Periodic summary email dispatched to ${recipient} (Thread ID: ${threadId || 'Sent'})`);
          } catch (mailErr: any) {
            console.warn('[SyncLoopAgent] Failed to dispatch periodic summary email:', mailErr.message);
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const runResult: SyncRunResult = {
        runId,
        timestamp: new Date().toISOString(),
        totalFetched,
        totalPassedFilters: passedItems.length,
        totalRejected: totalFetched - passedItems.length,
        nodesCreated: createdNodes.length,
        edgesCreated: createdEdges.length,
        createdNodeLabels,
        rejectionBreakdown,
        durationMs,
      };

      if (!isDryRun) {
        this.lastRunResult = runResult;
        if (this.config.enabled && this.config.intervalMinutes > 0) {
          this.nextSyncTimestamp = new Date(Date.now() + this.config.intervalMinutes * 60 * 1000).toISOString();
        }

        // Notify listeners (SSE / websocket)
        this.listeners.forEach(fn => {
          try {
            fn(runResult, createdNodes, createdEdges);
          } catch (e) {
            console.error('[SyncLoopAgent] Listener error:', e);
          }
        });
      }

      console.log(`[SyncLoopAgent] Sync completed: ${passedItems.length}/${totalFetched} items passed filters (${durationMs}ms).`);

      return {
        result: runResult,
        nodes: createdNodes,
        edges: createdEdges,
        previewItems,
      };
    } finally {
      if (!isDryRun) this.isRunning = false;
    }
  }
}

export const syncLoopAgent = new SyncLoopAgent();
