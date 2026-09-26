import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  Database, 
  Activity,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Network
} from 'lucide-react';
import { KnowledgeGraph } from './components/KnowledgeGraph.js';
import { NodeDetailsDrawer } from './components/NodeDetailsDrawer.js';
import { KnowledgeSettingsModal, TabType } from './components/KnowledgeSettingsModal.js';
import { SyncStatusBadge } from './components/SyncStatusBadge.js';
import { HistoryDrawer } from './components/HistoryDrawer.js';
import { PromptInput } from './components/PromptInput.js';
import { ExecutionPage } from './components/ExecutionPage.js';
import { graphStore } from './services/graphStore.js';
import { 
  GraphNode, 
  KnowledgeGraphData, 
  WorkContext, 
  IndexingConfig, 
  IntegrationConnection, 
  InvestigationHistoryItem 
} from './types/graph.js';
import { WorkflowState, WorkflowEvent, PlanStep } from './types/index.js';

export function App() {
  // Theme State (Dark / Warm Paper Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Primary Page View Mode ('graph' = Knowledge Graph Canvas, 'execution' = Dedicated Run Page)
  const [currentView, setCurrentView] = useState<'graph' | 'execution'>('graph');

  // Knowledge Graph State
  const [graphData, setGraphData] = useState<KnowledgeGraphData>(graphStore.getGraphData());
  const [activeContext, setActiveContext] = useState<WorkContext>(graphStore.getActiveContext());
  const [indexingConfig, setIndexingConfig] = useState<IndexingConfig>(graphStore.getIndexingConfig());
  const [connections, setConnections] = useState<IntegrationConnection[]>(graphStore.getConnections());
  const [history, setHistory] = useState<InvestigationHistoryItem[]>(graphStore.getHistory());
  
  // Selected Node for Drawer
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Modals & Drawers Visibility
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<TabType>('connections');

  const handleOpenSettingsTab = (tab: TabType = 'connections') => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };

  // Active Workflow Execution State
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Subscribe to graphStore changes
  useEffect(() => {
    const unsubscribe = graphStore.subscribe(() => {
      setGraphData(graphStore.getGraphData());
      setActiveContext(graphStore.getActiveContext());
      setIndexingConfig(graphStore.getIndexingConfig());
      setConnections(graphStore.getConnections());
      setHistory(graphStore.getHistory());
    });
    return unsubscribe;
  }, []);

  // Update selectedNode reference if graphData changes
  useEffect(() => {
    if (selectedNode) {
      const updated = graphData.nodes.find((n: GraphNode) => n.id === selectedNode.id);
      if (updated) setSelectedNode(updated);
    }
  }, [graphData, selectedNode]);

  // Execute a new prompt investigation with SSE streaming
  const handleExecutePrompt = async (prompt: string, autoApprove: boolean) => {
    setIsLoading(true);
    setCurrentView('execution');
    setEvents([]);

    // Create a provisional workflow state
    const provisionalState: WorkflowState = {
      workflowId: `wf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userMessage: prompt,
      status: 'ANALYZING',
      currentStepIndex: 0,
      context: { autoApproveSideEffects: autoApprove },
      stepOutputs: {},
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setWorkflowState(provisionalState);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          message: prompt,
          stream: true,
          autoApproveSideEffects: autoApprove,
        }),
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr);

            if (data.type === 'step' && data.event) {
              const ev = data.event as WorkflowEvent;
              setEvents((prev: WorkflowEvent[]) => [...prev, ev]);

              if (ev.payload?.stepIndex !== undefined) {
                setWorkflowState((prev: WorkflowState | null) => prev ? {
                  ...prev,
                  currentStepIndex: ev.payload.stepIndex,
                } : null);
              }
            } else if (data.type === 'result' && data.result) {
              const resState = data.result as WorkflowState;
              setWorkflowState(resState);

              graphStore.addHistoryItem({
                id: resState.workflowId,
                prompt,
                timestamp: 'Just now',
                status: resState.status as any,
                summary: resState.taskResult?.summary,
                toolsUsed: resState.plan?.steps.map((s: PlanStep) => s.canonicalId) || [],
                nodesReferenced: [],
                workflowId: resState.workflowId
              });

              if (indexingConfig.autoSyncOnAction && resState.status === 'COMPLETED' && resState.taskResult) {
                const tools = resState.plan?.steps.map((s: PlanStep) => s.canonicalId) || [];
                const goalTitle = resState.goalAnalysis?.goal || resState.userMessage || prompt;
                graphStore.ingestWorkflowResults(resState, tools, resState.taskResult.summary, undefined, resState);
              }
            }
          } catch (e) {
            console.warn('Failed to parse SSE line:', jsonStr);
          }
        }
      }
    } catch (err: any) {
      console.error('Error running workflow:', err);
      setWorkflowState((prev: WorkflowState | null) => prev ? {
        ...prev,
        status: 'FAILED',
        error: err.message || 'Unknown network error'
      } : null);
    } finally {
      setIsLoading(false);
    }
  };

  // Resume workflow with missing input parameters
  const handleSubmitInputs = async (inputs: Record<string, any>) => {
    if (!workflowState) return;
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:3001/api/workflow/${workflowState.workflowId}/submit-input`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputValues: inputs }),
      });
      const data = await res.json();
      setWorkflowState(data);
    } catch (e: any) {
      console.error('Failed to submit inputs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm or decline consequential action
  const handleConfirmAction = async (approved: boolean) => {
    if (!workflowState) return;
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:3001/api/workflow/${workflowState.workflowId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      });
      const data = await res.json();
      setWorkflowState(data);
    } catch (e: any) {
      console.error('Failed to confirm action:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect provider auth directly into vault
  const handleConnectAuth = async (provider: string, apiKey: string) => {
    if (!workflowState) return;
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:3001/api/workflow/${workflowState.workflowId}/connect-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await res.json();
      setWorkflowState(data);
    } catch (e: any) {
      console.error('Failed to connect auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify provider auth status
  const handleVerifyAuth = async () => {
    if (!workflowState) return;
    setIsLoading(true);

    try {
      const res = await fetch(`http://localhost:3001/api/workflow/${workflowState.workflowId}/verify-auth`, {
        method: 'POST',
      });
      const data = await res.json();
      setWorkflowState(data);
    } catch (e: any) {
      console.error('Failed to verify auth:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel active workflow
  const handleCancelWorkflow = async () => {
    if (!workflowState) return;
    try {
      await fetch(`http://localhost:3001/api/workflow/${workflowState.workflowId}/cancel`, {
        method: 'POST',
      });
      setWorkflowState((prev: WorkflowState | null) => prev ? { ...prev, status: 'CANCELLED' } : null);
    } catch (e) {
      console.error('Failed to cancel workflow:', e);
    }
  };

  // Ingest completed workflow into live graph
  const handleIngestToGraph = (goal: string, tools: string[], summary: string) => {
    graphStore.ingestWorkflowResults(workflowState || goal, tools, summary, undefined, workflowState);
  };

  // Trigger investigation pre-filled from node details
  const handleInvestigateNode = (node: GraphNode) => {
    setSelectedNode(null);
    handleExecutePrompt(
      `Investigate context, dependencies, and action items related to ${node.label} (${node.summary})`,
      false
    );
  };

  // Select investigation from history drawer
  const handleSelectHistoryItem = async (item: InvestigationHistoryItem) => {
    setIsHistoryOpen(false);
    if (item.workflowId) {
      try {
        const res = await fetch(`http://localhost:3001/api/workflow/${item.workflowId}`);
        const data = await res.json();
        if (data.success && data.workflow) {
          setWorkflowState(data.workflow);
          setCurrentView('execution');
          return;
        }
      } catch (e) {
        console.warn('Could not fetch historical workflow state:', e);
      }
    }
    handleExecutePrompt(item.prompt, false);
  };

  // Export Graph JSON
  const handleExportGraph = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(graphData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `swytchcode-knowledge-graph-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isWorkflowActive = workflowState && (
    workflowState.status === 'ANALYZING' ||
    workflowState.status === 'DISCOVERING_TOOLS' ||
    workflowState.status === 'PLANNING' ||
    workflowState.status === 'EXECUTING' ||
    workflowState.status === 'WAITING_FOR_INPUT' ||
    workflowState.status === 'WAITING_FOR_AUTH' ||
    workflowState.status === 'WAITING_FOR_CONFIRMATION' ||
    workflowState.status === 'PAUSED'
  );

  return (
    <div className={`relative flex flex-col h-screen w-screen ${theme === 'light' ? 'bg-[#f4f0ea] text-zinc-900' : 'bg-[#0a0a0a] text-[#e8e8e8] bg-grid-lines'} overflow-hidden font-sans select-none transition-colors duration-300`}>
      
      {/* Ambient Blur Blobs (Top-Right: #2a2a2a, Bottom-Left: #112233) */}
      {theme === 'dark' && (
        <>
          <div className="ambient-glow-top-right" />
          <div className="ambient-glow-bottom-left" />
        </>
      )}

      {/* 1. TOP NAVIGATION BAR (Navbar Header with blur 20px) */}
      <header className="h-14 navbar-glass px-4 md:px-6 flex items-center justify-between z-30 flex-shrink-0 transition-colors border-b border-[var(--surface-border)]">
        
        {/* Left: Hamburger Menu + Logo + View Toggle Pills */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className={`p-2 ${theme === 'light' ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-white card-glass'} rounded-xl transition-colors cursor-pointer`}
            title="Open Investigation History"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setCurrentView('graph')}
            className="flex items-center gap-2 cursor-pointer focus:outline-none"
            title="Go to Knowledge Graph Home"
          >
            <h1 className={`text-base font-bold tracking-wider font-heading ${theme === 'light' ? 'text-zinc-900' : 'text-white'}`}>
              RECALL
            </h1>
          </button>

          {/* Primary View Switcher Tabs */}
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5 ml-2">
            <button
              onClick={() => setCurrentView('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                currentView === 'graph'
                  ? 'bg-white/10 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Graph</span>
            </button>

            <button
              onClick={() => setCurrentView('execution')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                currentView === 'execution'
                  ? 'bg-white/10 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Investigation</span>
              {isWorkflowActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Active Run Status Pill + Theme Toggle + Settings Button */}
        <div className="flex items-center gap-2">
          {isWorkflowActive && currentView === 'graph' && (
            <button
              onClick={() => setCurrentView('execution')}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 text-indigo-400 text-xs font-semibold rounded-xl shadow-lg animate-pulse transition-all cursor-pointer"
              title="Click to view live execution page"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Active Run ({workflowState?.status.replace(/_/g, ' ')})</span>
            </button>
          )}

          <SyncStatusBadge
            onOpenSettings={handleOpenSettingsTab}
            onSyncCompleted={() => setGraphData(graphStore.getGraphData())}
          />

          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light (Warm Paper)' : 'Dark'} mode`}
            className={`p-2 ${theme === 'light' ? 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200' : 'text-zinc-400 hover:text-white card-glass'} rounded-xl transition-colors cursor-pointer`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleOpenSettingsTab('connections')}
            className={`flex items-center gap-2 px-3.5 py-1.5 ${theme === 'light' ? 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-800' : 'card-glass text-zinc-200 hover:text-white'} text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>

      </header>

      {/* 2. DEDICATED MAIN PAGE BODY (SWITCHES BETWEEN GRAPH VIEW AND EXECUTION PAGE) */}
      {currentView === 'graph' ? (
        <div className="flex-1 flex flex-col min-h-0 max-w-[1440px] w-full mx-auto px-3 sm:px-5 py-3 overflow-hidden z-10">
          
          {/* Embedded Knowledge Graph Card */}
          <div className={`relative w-full flex-1 rounded-3xl ${theme === 'light' ? 'border border-zinc-300/80 bg-[#fbf9f6] shadow-xl' : 'graph-canvas-container shadow-[0_0_50px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/5'} overflow-hidden flex flex-col transition-colors`}>
            <KnowledgeGraph
              data={graphData}
              selectedNodeId={selectedNode?.id || null}
              onSelectNode={(node: GraphNode | null) => setSelectedNode(node)}
              onInvestigateNode={handleInvestigateNode}
              activeContextName={activeContext.name}
              theme={theme}
              onToggleTheme={toggleTheme}
            />
          </div>

          {/* Prompt Input Bar Section */}
          <div className="pt-2 flex-shrink-0">
            <PromptInput
              onSubmit={handleExecutePrompt}
              isLoading={isLoading}
              activeContext={activeContext}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          </div>

        </div>
      ) : (
        /* Dedicated Full Execution Page */
        <ExecutionPage
          workflowState={workflowState}
          events={events}
          isLoading={isLoading}
          onBackToGraph={() => setCurrentView('graph')}
          onSubmitInputs={handleSubmitInputs}
          onConfirmAction={handleConfirmAction}
          onConnectAuth={handleConnectAuth}
          onVerifyAuth={handleVerifyAuth}
          onCancelWorkflow={handleCancelWorkflow}
          onIngestToGraph={handleIngestToGraph}
          onExecutePrompt={handleExecutePrompt}
          theme={theme}
        />
      )}

      {/* 3. RIGHT SLIDE-OUT NODE DETAILS DRAWER */}
      <NodeDetailsDrawer
        node={selectedNode}
        edges={graphData.edges}
        allNodes={graphData.nodes}
        onClose={() => setSelectedNode(null)}
        onSelectNode={(node: GraphNode) => setSelectedNode(node)}
        onInvestigateNode={handleInvestigateNode}
      />

      {/* 4. LEFT SLIDE-OUT INVESTIGATION HISTORY DRAWER */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectInvestigation={handleSelectHistoryItem}
        onNewInvestigation={() => {
          setWorkflowState(null);
          setEvents([]);
          setCurrentView('graph');
        }}
      />

      {/* 5. KNOWLEDGE BASE SETTINGS MODAL */}
      <KnowledgeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeContext={activeContext}
        onSelectContext={(id: string) => graphStore.setActiveContext(id)}
        indexingConfig={indexingConfig}
        onUpdateIndexingConfig={(cfg: Partial<IndexingConfig>) => graphStore.updateIndexingConfig(cfg)}
        connections={connections}
        onUpdateConnection={(id: string, upd: Partial<IntegrationConnection>) => graphStore.updateConnection(id, upd)}
        totalNodes={graphData.nodes.length}
        totalEdges={graphData.edges.length}
        onResetGraph={() => graphStore.resetToDefaults()}
        onExportGraph={handleExportGraph}
        initialTab={settingsInitialTab}
        onSyncIngested={() => setGraphData(graphStore.getGraphData())}
      />

    </div>
  );
}

export default App;
