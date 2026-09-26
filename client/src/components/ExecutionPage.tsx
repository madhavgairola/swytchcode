import React, { useState, useRef, useEffect } from 'react';
import { 
  WorkflowState, 
  WorkflowEvent, 
  PlanStep,
  DynamicFormField,
  ActionAuditItem
} from '../types/index.js';
import { 
  ArrowLeft,
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  ShieldCheck, 
  Sparkles, 
  Key, 
  Layers,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Copy,
  Check,
  Download,
  Share2,
  Clock,
  ArrowUp,
  Mail,
  MessageSquare,
  BookOpen,
  Folder,
  Database,
  Search,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExecutionPageProps {
  workflowState: WorkflowState | null;
  events: WorkflowEvent[];
  isLoading: boolean;
  onBackToGraph: () => void;
  onSubmitInputs: (inputs: Record<string, any>) => void;
  onConfirmAction: (approved: boolean) => void;
  onConnectAuth: (provider: string, apiKey: string) => void;
  onVerifyAuth: () => void;
  onCancelWorkflow: () => void;
  onIngestToGraph: (goal: string, tools: string[], summary: string) => void;
  onExecutePrompt: (prompt: string, autoApprove: boolean) => void;
  theme?: 'dark' | 'light';
}

const QUICK_FOLLOWUPS = [
  'Synthesize findings with Google Drive architecture specs',
  'Draft an email to Alex summarizing key decision consensus',
  'Post this status report into Slack #infra channel',
  'Create a Notion documentation page with these findings',
  'Search Box compliance storage for signed DPA addendum',
];

export const ExecutionPage: React.FC<ExecutionPageProps> = ({
  workflowState,
  events,
  isLoading,
  onBackToGraph,
  onSubmitInputs,
  onConfirmAction,
  onConnectAuth,
  onVerifyAuth,
  onCancelWorkflow,
  onIngestToGraph,
  onExecutePrompt,
  theme = 'dark',
}) => {
  const [activeTab, setActiveTab] = useState<'result' | 'timeline' | 'audit'>('result');
  const [inputFormValues, setInputFormValues] = useState<Record<string, any>>({});
  const [authApiKey, setAuthApiKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasIngested, setHasIngested] = useState<boolean>(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [followupPrompt, setFollowupPrompt] = useState<string>('');
  const telemetryEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-switch to result tab when completed
  useEffect(() => {
    if (workflowState?.status === 'COMPLETED' && workflowState.taskResult) {
      setActiveTab('result');
    } else if (workflowState?.status === 'EXECUTING' || workflowState?.status === 'PLANNING') {
      setActiveTab('timeline');
    }
  }, [workflowState?.status]);

  // Auto-scroll telemetry log
  useEffect(() => {
    if (activeTab === 'audit' && telemetryEndRef.current) {
      telemetryEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, activeTab]);

  if (!workflowState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-16 h-16 rounded-3xl card-glass flex items-center justify-center mb-4 text-zinc-500">
          <Terminal className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white font-heading mb-2">No Active Investigation Run</h2>
        <p className="text-xs text-zinc-400 max-w-md mb-6">
          Launch an autonomous multi-assistant investigation from the Knowledge Graph or select an item from investigation history.
        </p>
        <button
          onClick={onBackToGraph}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Knowledge Graph</span>
        </button>
      </div>
    );
  }

  const isCompleted = workflowState.status === 'COMPLETED';
  const isFailed = workflowState.status === 'FAILED';
  const isWaitingForInput = workflowState.status === 'WAITING_FOR_INPUT';
  const isWaitingForAuth = workflowState.status === 'WAITING_FOR_AUTH';
  const isWaitingForConfirm = workflowState.status === 'WAITING_FOR_CONFIRMATION';
  const isPaused = isWaitingForInput || isWaitingForAuth || isWaitingForConfirm || workflowState.status === 'PAUSED';
  const isRunning = workflowState.status === 'ANALYZING' || 
    workflowState.status === 'DISCOVERING_TOOLS' || 
    workflowState.status === 'PLANNING' || 
    workflowState.status === 'EXECUTING';

  const pendingInput = workflowState.missingInputRequest;
  const pendingAuth = workflowState.authRequest;
  const pendingConfirm = workflowState.confirmationRequest;
  const taskResult = workflowState.taskResult;
  const goalTitle = workflowState.goalAnalysis?.goal || workflowState.userMessage || 'Autonomous Investigation Workflow';

  const toggleLog = (key: string) => {
    setExpandedLogs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyRunId = () => {
    navigator.clipboard.writeText(workflowState.workflowId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingInput) return;
    setIsSubmitting(true);
    onSubmitInputs(inputFormValues);
    setIsSubmitting(false);
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAuth || !authApiKey.trim()) return;
    setIsSubmitting(true);
    onConnectAuth(pendingAuth.provider, authApiKey.trim());
    setIsSubmitting(false);
  };

  const handleIngestClick = () => {
    if (hasIngested || !taskResult) return;
    const tools = workflowState.plan?.steps.map((s: PlanStep) => s.canonicalId) || [];
    onIngestToGraph(goalTitle, tools, taskResult.summary);
    setHasIngested(true);
  };

  const handleExportJson = () => {
    const exportData = {
      workflowId: workflowState.workflowId,
      timestamp: new Date().toISOString(),
      status: workflowState.status,
      goal: workflowState.goalAnalysis,
      plan: workflowState.plan,
      result: workflowState.taskResult,
      events,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `recall-investigation-${workflowState.workflowId}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleFollowupSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followupPrompt.trim() || isLoading) return;
    onExecutePrompt(followupPrompt.trim(), false);
    setFollowupPrompt('');
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-3 overflow-hidden z-10 select-none">
      
      {/* 1. TOP PAGE NAVIGATION BAR & BREADCRUMB */}
      <div className="flex items-center justify-between gap-3 pb-3 flex-shrink-0">
        
        {/* Left: Back Button + Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToGraph}
            className="flex items-center gap-1.5 px-3 py-1.5 card-glass hover:bg-white/5 text-zinc-300 hover:text-white rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm flex-shrink-0"
            title="Return to Interactive Knowledge Graph"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Knowledge Graph</span>
          </button>

          <span className="text-zinc-600 font-mono text-xs hidden sm:inline">/</span>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-mono text-zinc-400 truncate hidden md:inline">
              Investigation Run:
            </span>
            <button
              onClick={handleCopyRunId}
              className="flex items-center gap-1.5 px-2.5 py-1 card-glass hover:bg-white/5 text-zinc-300 hover:text-white rounded-lg text-xs font-mono transition-all cursor-pointer"
              title="Click to copy Run ID"
            >
              <span className="text-indigo-400 font-semibold">{workflowState.workflowId}</span>
              {copiedId ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-zinc-500" />
              )}
            </button>
          </div>
        </div>

        {/* Right: Status Pill & Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Status Badge */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono uppercase tracking-wider border shadow-sm ${
            isCompleted
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : isPaused
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
              : isFailed
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isCompleted ? 'bg-emerald-400' : isFailed ? 'bg-rose-400' : isPaused ? 'bg-amber-400 animate-ping' : 'bg-indigo-400 animate-ping'
            }`} />
            <span>{workflowState.status.replace(/_/g, ' ')}</span>
          </span>

          {/* Ingest to Graph Button */}
          {isCompleted && taskResult && (
            <button
              onClick={handleIngestClick}
              disabled={hasIngested}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl shadow-md transition-all cursor-pointer ${
                hasIngested
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{hasIngested ? 'Added to Graph' : 'Add to Graph'}</span>
            </button>
          )}

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            className="p-2 card-glass hover:text-white text-zinc-400 rounded-xl transition-all cursor-pointer shadow-sm"
            title="Export Telemetry JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Cancel Run if active */}
          {isRunning && (
            <button
              onClick={onCancelWorkflow}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

      </div>

      {/* 2. GOAL HEADER CARD & REASONING SUMMARY */}
      <div className="card-glass rounded-2xl p-4 mb-3 border border-[var(--surface-border)] shadow-md flex-shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Objective
              </span>
              {workflowState.goalAnalysis?.intentCategory && (
                <span className="text-[10px] font-mono bg-white/5 text-zinc-300 px-2 py-0.5 rounded-full border border-white/10">
                  {workflowState.goalAnalysis.intentCategory.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white font-heading leading-snug">
              {goalTitle}
            </h1>
          </div>

          {/* Discovered Tool Pills */}
          {workflowState.plan?.steps && workflowState.plan.steps.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-mono text-zinc-500 mr-1">Pipeline:</span>
              {workflowState.plan.steps.map((step, idx) => (
                <span
                  key={idx}
                  className={`text-[10px] font-mono px-2.5 py-1 rounded-lg border transition-all ${
                    step.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : step.status === 'executing'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 animate-pulse'
                      : step.status === 'failed'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-white/5 text-zinc-400 border-white/5'
                  }`}
                  title={`${step.canonicalId}: ${step.action}`}
                >
                  {step.canonicalId}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. INTERACTIVE GATING CARDS (Missing Input / Auth / Confirmation) */}
      
      {/* A. Missing Parameters Gate */}
      {isWaitingForInput && pendingInput && (
        <div className="p-4 mb-3 rounded-2xl card-glass border border-amber-500/40 bg-amber-500/5 space-y-3 flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <h3 className="text-xs font-bold font-heading">Missing Parameters Required</h3>
          </div>
          <p className="text-xs text-zinc-300">
            {pendingInput.actionDescription || 'Required parameters are needed to execute this canonical method safely.'}
          </p>

          <form onSubmit={handleInputSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pendingInput.fields.map((field: DynamicFormField) => (
                <div key={field.name} className="space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 flex items-center justify-between">
                    <span>{field.label} {field.required && <span className="text-rose-400">*</span>}</span>
                  </label>
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={inputFormValues[field.name] || ''}
                    onChange={(e) => setInputFormValues({ ...inputFormValues, [field.name]: e.target.value })}
                    required={field.required}
                    className="w-full card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500 border border-white/10"
                  />
                  {field.whyRequired && (
                    <p className="text-[10px] text-zinc-500 font-mono">{field.whyRequired}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancelWorkflow}
                className="px-3 py-1.5 card-glass text-zinc-400 hover:text-white text-xs font-mono rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer shadow-lg"
              >
                {isSubmitting ? 'Resuming Execution...' : 'Submit & Resume Workflow'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. Provider Authentication Gate */}
      {isWaitingForAuth && pendingAuth && (
        <div className="p-4 mb-3 rounded-2xl card-glass border border-indigo-500/40 bg-indigo-500/5 space-y-3 flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-indigo-400">
            <Key className="w-4 h-4" />
            <h3 className="text-xs font-bold font-heading">
              Authentication Required for {pendingAuth.provider}
            </h3>
          </div>
          <p className="text-xs text-zinc-300">
            {pendingAuth.instructions || `Authorized credentials required for provider '${pendingAuth.provider}'.`}
          </p>

          {pendingAuth.provider.toLowerCase().includes('resend') ? (
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div className="max-w-md">
                <input
                  type="password"
                  placeholder={`Enter ${pendingAuth.provider} API Key (e.g. re_...)`}
                  value={authApiKey}
                  onChange={(e) => setAuthApiKey(e.target.value)}
                  required
                  className="w-full card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 border border-white/10"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCancelWorkflow}
                  className="px-3 py-1.5 card-glass text-zinc-400 hover:text-white text-xs font-mono rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !authApiKey.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Connecting...' : 'Save Key & Resume'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10 font-mono text-xs text-zinc-300 space-y-1">
                <p className="text-zinc-400">Run this command in your terminal to refresh your Swytchcode session:</p>
                <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-lg border border-white/5 text-indigo-300">
                  <span>swytchcode login</span>
                  <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onCancelWorkflow}
                  className="px-3 py-1.5 card-glass text-zinc-400 hover:text-white text-xs font-mono rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onVerifyAuth}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer shadow-lg"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify Session & Resume'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C. Consequential Side-Effect Confirmation Gate */}
      {isWaitingForConfirm && pendingConfirm && (
        <div className="p-4 mb-3 rounded-2xl card-glass border border-purple-500/40 bg-purple-500/5 space-y-3 flex-shrink-0 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-purple-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-xs font-bold font-heading">
              Consequential Side-Effect Confirmation Gate
            </h3>
          </div>
          <p className="text-xs text-zinc-300">
            The autonomous pipeline is about to execute a consequential external operation:
            <strong className="text-white font-mono ml-1.5 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
              {pendingConfirm.canonicalId}
            </strong>
          </p>

          <div className="card-glass p-3 rounded-xl space-y-1.5 border border-white/10">
            <span className="text-[10px] font-mono text-zinc-400 block">Payload Parameters:</span>
            <pre className="text-xs font-mono text-indigo-300 overflow-x-auto max-h-36">
              {JSON.stringify(pendingConfirm.parameters, null, 2)}
            </pre>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onConfirmAction(false)}
              className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono rounded-xl border border-rose-500/30 cursor-pointer"
            >
              Decline & Abort
            </button>
            <button
              type="button"
              onClick={() => onConfirmAction(true)}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer shadow-lg"
            >
              Approve & Execute Operation
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN MULTI-TAB WORKSPACE AREA */}
      <div className="flex-1 min-h-0 flex flex-col card-glass rounded-2xl border border-[var(--surface-border)] overflow-hidden shadow-xl">
        
        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-[var(--surface-border)] px-4 sm:px-6 bg-black/30 flex-shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Tab: Results */}
            <button
              onClick={() => setActiveTab('result')}
              className={`py-3 px-3.5 border-b-2 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'result'
                  ? 'border-indigo-500 text-white font-semibold bg-white/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Intelligence & Report</span>
              {taskResult && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            {/* Tab: Timeline / Steps */}
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 px-3.5 border-b-2 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-indigo-500 text-white font-semibold bg-white/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Execution Pipeline</span>
              <span className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.2 rounded-full font-mono">
                {workflowState.plan?.steps.length || 0}
              </span>
            </button>

            {/* Tab: Kernel Telemetry Logs */}
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-3 px-3.5 border-b-2 text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-indigo-500 text-white font-semibold bg-white/5'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kernel Telemetry</span>
              <span className="text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.2 rounded-full font-mono">
                {events.length}
              </span>
            </button>

          </div>

          <div className="text-[10px] font-mono text-zinc-500 hidden md:block">
            Swytchcode Kernel v1.0 • Isolated Sandbox
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">

          {/* TAB 1: SYNTHESIZED RESULTS & INTELLIGENCE REPORT */}
          {activeTab === 'result' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {taskResult ? (
                <>
                  {/* Workspace Artifacts Direct Link Card */}
                  {(() => {
                    const directArtifacts = taskResult.artifacts || [];
                    const fallbackArtifacts: Array<{ title: string; url: string; type: string; description?: string }> = [];
                    if (workflowState?.stepOutputs) {
                      for (const [cid, output] of Object.entries(workflowState.stepOutputs)) {
                        const outData = (output as any)?.data || output;
                        if (cid.startsWith('notion.') && (outData?.url || outData?.id)) {
                          const url = outData.url || `https://app.notion.com/p/${String(outData.id).replace(/-/g, '')}`;
                          if (!directArtifacts.some(a => a.url === url)) {
                            fallbackArtifacts.push({
                              title: outData.properties?.title?.title?.[0]?.plain_text || outData.properties?.title?.[0]?.text?.content || 'Notion Page',
                              url,
                              type: 'notion',
                              description: `Created Notion Document (${outData.id || ''})`,
                            });
                          }
                        }
                      }
                    }
                    const allArtifacts = [...directArtifacts, ...fallbackArtifacts];

                    if (allArtifacts.length === 0) return null;

                    return (
                      <div className="card-glass rounded-2xl p-4 border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-black/40 shadow-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-xs font-bold text-white font-heading">
                              Generated Workspace Documents & Direct Links
                            </h3>
                          </div>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            Live Link Active
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {allArtifacts.map((art, idx) => (
                            <a
                              key={idx}
                              href={art.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-400/50 transition-all text-white group cursor-pointer shadow-sm"
                            >
                              <div className="space-y-0.5 overflow-hidden">
                                <h4 className="text-xs font-bold font-heading text-indigo-200 group-hover:text-white flex items-center gap-1.5 truncate">
                                  {art.title}
                                </h4>
                                <p className="text-[11px] text-zinc-400 truncate">{art.description || art.url}</p>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-mono font-semibold text-indigo-400 group-hover:text-indigo-200 ml-3 flex-shrink-0 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20 group-hover:border-indigo-400/40">
                                <span>Open</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Synthesis Card */}
                  <div className="card-glass rounded-2xl p-5 sm:p-6 border border-[var(--surface-border)] shadow-lg space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-white font-heading">
                          Synthesized Intelligence Briefing
                        </h2>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Multi-Source Verified
                      </span>
                    </div>

                    <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-zinc-200 leading-relaxed font-sans select-text">
                      <ReactMarkdown
                        components={{
                          a: ({ node, ...props }) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 underline font-medium inline-flex items-center gap-1 transition-colors"
                            />
                          ),
                        }}
                      >
                        {taskResult.markdown || taskResult.summary}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Actions Taken Audit Table */}
                  {taskResult.actionsTaken && taskResult.actionsTaken.length > 0 && (
                    <div className="card-glass rounded-2xl p-4 border border-[var(--surface-border)] space-y-3">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                        <span>Executed Tool Actions ({taskResult.actionsTaken.length})</span>
                        <span className="text-[10px] text-zinc-500 lowercase">swytchcode kernel verified</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {taskResult.actionsTaken.map((act: ActionAuditItem, idx: number) => (
                          <div key={idx} className="p-3 card-glass rounded-xl text-xs space-y-1.5 border border-white/5">
                            <div className="flex items-center justify-between font-mono">
                              <span className="text-indigo-400 font-semibold text-[11px]">{act.canonicalId}</span>
                              <span className="text-emerald-400 text-[10px] font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {act.latencyMs}ms
                              </span>
                            </div>
                            <p className="text-zinc-300 text-[11px] font-sans leading-normal">{act.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-2xl card-glass flex items-center justify-center mb-3 text-indigo-400 animate-pulse">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white font-heading mb-1">
                    {isRunning ? 'Synthesizing Results...' : 'No Synthesized Results Yet'}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    {isRunning
                      ? 'The AI model is currently executing pipeline steps and will synthesize the final briefing once complete.'
                      : 'Run an investigation prompt to generate multi-source intelligence.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINE & EXECUTION STEPS */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              
              {/* Reasoning Card */}
              {workflowState.goalAnalysis && (
                <div className="p-4 rounded-xl card-glass space-y-1.5 text-xs border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5 font-heading">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Gemini Strategic Goal Decomposition
                    </span>
                    <span className="text-zinc-500 font-mono text-[10px] capitalize">
                      {workflowState.goalAnalysis.intentCategory.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">
                    Target Goal: <span className="text-white font-medium">{workflowState.goalAnalysis.goal}</span>
                  </p>
                  {workflowState.goalAnalysis.requiredCapabilities && (
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[10px] font-mono text-zinc-500">Searched Capabilities:</span>
                      {workflowState.goalAnalysis.requiredCapabilities.map((cap, i) => (
                        <span key={i} className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                          {cap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step Pipeline List */}
              <div className="space-y-3">
                {workflowState.plan?.steps.map((step: PlanStep, idx: number) => {
                  const isCurrent = workflowState.currentStepIndex === idx && isRunning;
                  const isStepCompleted = step.status === 'completed';
                  const isStepFailed = step.status === 'failed';

                  return (
                    <div
                      key={step.id || idx}
                      className={`p-4 rounded-xl card-glass transition-all border ${
                        isStepCompleted
                          ? 'border-emerald-500/20 bg-emerald-500/2'
                          : isCurrent
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                          : isStepFailed
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : 'border-[var(--surface-border)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold flex-shrink-0 mt-0.5 ${
                            isStepCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isCurrent
                              ? 'bg-indigo-500 text-white animate-pulse'
                              : 'bg-white/5 text-zinc-400'
                          }`}>
                            {idx + 1}
                          </span>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-bold text-white font-mono">
                                {step.canonicalId}
                              </h4>
                              {step.isSideEffect && (
                                <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                                  Side-Effect Gated
                                </span>
                              )}
                              <span className="text-[9px] font-mono bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded">
                                {step.integrationName}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 font-sans leading-normal">
                              {step.action}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs flex-shrink-0">
                          {step.latencyMs !== undefined && (
                            <span className="text-[10px] text-zinc-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                              {step.latencyMs}ms
                            </span>
                          )}
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${
                            isStepCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : isCurrent
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 animate-pulse'
                              : isStepFailed
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-white/5 text-zinc-400 border border-white/5'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* Expandable Payload Viewer */}
                      {(step.inputs || step.output) && (
                        <div className="mt-3 pt-2.5 border-t border-white/5">
                          <button
                            onClick={() => toggleLog(`step-${idx}`)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer transition-colors"
                          >
                            {expandedLogs[`step-${idx}`] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            <span>{expandedLogs[`step-${idx}`] ? 'Hide I/O Payload' : 'Inspect Input / Output Payload'}</span>
                          </button>

                          {expandedLogs[`step-${idx}`] && (
                            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-mono select-text">
                              <div className="card-glass p-3 rounded-xl border border-white/5 bg-black/40">
                                <span className="text-zinc-400 block mb-1 font-semibold text-[10px] uppercase tracking-wider">
                                  Method Inputs:
                                </span>
                                <pre className="text-zinc-300 overflow-x-auto max-h-40 custom-scrollbar">
                                  {JSON.stringify(step.inputs, null, 2)}
                                </pre>
                              </div>
                              <div className="card-glass p-3 rounded-xl border border-white/5 bg-black/40">
                                <span className="text-emerald-400 block mb-1 font-semibold text-[10px] uppercase tracking-wider">
                                  Kernel Output:
                                </span>
                                <pre className="text-emerald-300 overflow-x-auto max-h-40 custom-scrollbar">
                                  {JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: KERNEL TELEMETRY STREAM */}
          {activeTab === 'audit' && (
            <div className="space-y-3 max-w-4xl mx-auto">
              <div className="p-4 rounded-xl card-glass font-mono text-xs space-y-2 border border-white/5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 text-zinc-400">
                  <span className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">Live Execution Kernel Stream</span>
                  </span>
                  <span className="text-[11px] text-zinc-500">{events.length} Telemetry Events</span>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pt-2 select-text">
                  {events.map((ev: WorkflowEvent, idx: number) => (
                    <div key={idx} className="p-3 rounded-xl card-glass text-xs leading-relaxed border border-white/5 bg-black/30">
                      <div className="flex items-center justify-between text-zinc-500 mb-1 text-[10px]">
                        <span className="text-indigo-400 font-bold uppercase tracking-wider bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          {ev.step}
                        </span>
                        <span>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}</span>
                      </div>
                      <div className="text-zinc-200 font-sans text-xs">
                        {ev.message}
                      </div>
                      {ev.payload && (
                        <pre className="mt-2 text-[10px] text-zinc-400 overflow-x-auto p-2.5 rounded-lg bg-black/50 border border-white/5">
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                  <div ref={telemetryEndRef} />
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 5. INTEGRATED FOLLOW-UP PROMPT BAR AT BOTTOM */}
        <div className="p-3 sm:p-4 border-t border-[var(--surface-border)] bg-black/40 flex-shrink-0">
          
          {/* Quick presets pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-[10px] font-mono text-zinc-500 mr-1 flex-shrink-0">Follow-up:</span>
            {QUICK_FOLLOWUPS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setFollowupPrompt(q)}
                className="flex-shrink-0 px-2.5 py-1 card-glass hover:bg-white/5 text-zinc-300 hover:text-white rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap border border-white/5"
              >
                {q}
              </button>
            ))}
          </div>

          <form onSubmit={handleFollowupSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask a follow-up or trigger next autonomous integration..."
              value={followupPrompt}
              onChange={(e) => setFollowupPrompt(e.target.value)}
              disabled={isLoading}
              className="flex-1 card-glass text-xs font-sans text-white px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-indigo-500 border border-white/10 placeholder:text-zinc-500"
            />
            <button
              type="submit"
              disabled={isLoading || !followupPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-mono font-medium rounded-xl shadow-md transition-all cursor-pointer flex-shrink-0"
            >
              <ArrowUp className="w-4 h-4" />
              <span className="hidden sm:inline">Run</span>
            </button>
          </form>

        </div>

      </div>

    </div>
  );
};

export default ExecutionPage;
