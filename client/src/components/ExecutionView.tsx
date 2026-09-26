import React, { useState } from 'react';
import { 
  WorkflowState, 
  WorkflowEvent, 
  PlanStep,
  DynamicFormField,
  ActionAuditItem
} from '../types/index.js';
import { 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  ShieldCheck, 
  Sparkles, 
  Key, 
  Layers,
  ChevronDown,
  ChevronUp,
  Minimize2,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExecutionViewProps {
  workflowState: WorkflowState | null;
  events: WorkflowEvent[];
  isLoading: boolean;
  onClose: () => void;
  onSubmitInputs: (inputs: Record<string, any>) => void;
  onConfirmAction: (approved: boolean) => void;
  onConnectAuth: (provider: string, apiKey: string) => void;
  onVerifyAuth: () => void;
  onCancelWorkflow: () => void;
  onIngestToGraph: (goal: string, tools: string[], summary: string) => void;
}

export const ExecutionView: React.FC<ExecutionViewProps> = ({
  workflowState,
  events,
  isLoading,
  onClose,
  onSubmitInputs,
  onConfirmAction,
  onConnectAuth,
  onVerifyAuth,
  onCancelWorkflow,
  onIngestToGraph,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'audit' | 'result'>('timeline');
  const [inputFormValues, setInputFormValues] = useState<Record<string, any>>({});
  const [authApiKey, setAuthApiKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hasIngested, setHasIngested] = useState<boolean>(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  if (!workflowState) return null;

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
  const goalTitle = workflowState.goalAnalysis?.goal || workflowState.userMessage || 'Autonomous Workflow';

  const toggleLog = (key: string) => {
    setExpandedLogs(prev => ({ ...prev, [key]: !prev[key] }));
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center modal-backdrop-glass p-4 sm:p-6 select-none">
      <div className="w-full max-w-4xl terminal-glass rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200 border border-[var(--surface-border)]">
        
        {/* Minimal Header */}
        <div className="px-6 py-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white font-heading line-clamp-1 max-w-lg">
                  {goalTitle}
                </h2>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                  isCompleted
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : isPaused
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                    : isFailed
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                }`}>
                  {workflowState.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Run ID: {workflowState.workflowId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCompleted && taskResult && (
              <button
                onClick={handleIngestClick}
                disabled={hasIngested}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-xl shadow-md transition-all cursor-pointer ${
                  hasIngested
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{hasIngested ? 'Added to Graph' : 'Add to Graph'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Minimize & Return to Graph"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Tab Switcher */}
        <div className="flex border-b border-[var(--surface-border)] px-6 gap-2 bg-black/20">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-2.5 px-3 border-b-2 text-xs font-mono transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Timeline ({workflowState.plan?.steps.length || 0} Steps)
          </button>

          {taskResult && (
            <button
              onClick={() => setActiveTab('result')}
              className={`py-2.5 px-3 border-b-2 text-xs font-mono transition-colors cursor-pointer ${
                activeTab === 'result'
                  ? 'border-indigo-500 text-white font-medium'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Results
            </button>
          )}

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-2.5 px-3 border-b-2 text-xs font-mono transition-colors cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Kernel Telemetry ({events.length})
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

          {/* 1. Missing Information Gate */}
          {isWaitingForInput && pendingInput && (
            <div className="p-4 rounded-2xl card-glass border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <h3 className="text-xs font-bold font-heading">Missing Required Parameters</h3>
              </div>
              <p className="text-xs text-zinc-300">
                {pendingInput.actionDescription || 'Additional input parameters required to proceed safely.'}
              </p>

              <form onSubmit={handleInputSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                        className="w-full card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                      />
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
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer"
                  >
                    {isSubmitting ? 'Resuming...' : 'Submit & Continue'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. Authentication Gate */}
          {isWaitingForAuth && pendingAuth && (
            <div className="p-4 rounded-2xl card-glass border border-indigo-500/40 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Key className="w-4 h-4" />
                <h3 className="text-xs font-bold font-heading">
                  Authentication Required for {pendingAuth.provider}
                </h3>
              </div>
              <p className="text-xs text-zinc-300">
                {pendingAuth.instructions || `Authorized credentials required for provider '${pendingAuth.provider}'.`}
              </p>

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <input
                  type="password"
                  placeholder={`Enter ${pendingAuth.provider} secret key`}
                  value={authApiKey}
                  onChange={(e) => setAuthApiKey(e.target.value)}
                  required
                  className="w-full card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onVerifyAuth}
                    className="px-3 py-1.5 card-glass text-zinc-300 text-xs font-mono rounded-xl cursor-pointer"
                  >
                    Check Auth
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !authApiKey.trim()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer"
                  >
                    {isSubmitting ? 'Connecting...' : 'Authorize in Vault'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. Consequential Action Gate */}
          {isWaitingForConfirm && pendingConfirm && (
            <div className="p-4 rounded-2xl card-glass border border-purple-500/40 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
                <h3 className="text-xs font-bold font-heading">
                  Consequential Action Confirmation
                </h3>
              </div>
              <p className="text-xs text-zinc-300">
                Preparing to execute side-effect action: 
                <strong className="text-white font-mono ml-1">[{pendingConfirm.canonicalId}]</strong>
              </p>

              <div className="card-glass p-3 rounded-xl space-y-1">
                <pre className="text-xs font-mono text-indigo-300 overflow-x-auto">
                  {JSON.stringify(pendingConfirm.parameters, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onConfirmAction(false)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-mono rounded-xl border border-rose-500/30 cursor-pointer"
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={() => onConfirmAction(true)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl cursor-pointer"
                >
                  Approve & Run
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              {workflowState.goalAnalysis && (
                <div className="p-3.5 rounded-xl card-glass space-y-1 text-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      Gemini Reasoning Strategy
                    </span>
                    <span className="text-zinc-500 font-mono text-[10px] capitalize">
                      {workflowState.goalAnalysis.intentCategory.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Discovered {workflowState.goalAnalysis.requiredCapabilities.length} capability domains.
                  </p>
                </div>
              )}

              {/* Step Cards */}
              <div className="space-y-2">
                {workflowState.plan?.steps.map((step: PlanStep, idx: number) => {
                  const isCurrent = workflowState.currentStepIndex === idx && isRunning;
                  const isStepCompleted = step.status === 'completed';
                  const isStepFailed = step.status === 'failed';

                  return (
                    <div
                      key={step.id || idx}
                      className={`p-3.5 rounded-xl card-glass transition-all ${
                        isStepCompleted
                          ? 'border-emerald-500/20'
                          : isCurrent
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : isStepFailed
                          ? 'border-rose-500/30'
                          : 'border-[var(--surface-border)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                            isStepCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isCurrent
                              ? 'bg-indigo-500 text-white animate-pulse'
                              : 'bg-white/5 text-zinc-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-white font-mono">
                                {step.canonicalId}
                              </h4>
                              {step.isSideEffect && (
                                <span className="text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30 px-1.5 py-0.2 rounded">
                                  Gated
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 font-sans">
                              {step.action}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          {step.latencyMs !== undefined && (
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {step.latencyMs}ms
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            isStepCompleted
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : isCurrent
                              ? 'bg-indigo-500/20 text-indigo-300 animate-pulse'
                              : 'bg-white/5 text-zinc-400'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                      </div>

                      {/* Tool Payload Toggle */}
                      {(step.inputs || step.output) && (
                        <div className="mt-2.5 pt-2 border-t border-[var(--surface-border)]">
                          <button
                            onClick={() => toggleLog(`step-${idx}`)}
                            className="text-[10px] text-indigo-400 hover:text-white flex items-center gap-1 font-mono cursor-pointer"
                          >
                            {expandedLogs[`step-${idx}`] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            <span>{expandedLogs[`step-${idx}`] ? 'Hide Payload' : 'View Payload'}</span>
                          </button>

                          {expandedLogs[`step-${idx}`] && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono">
                              <div className="card-glass p-2 rounded-lg">
                                <span className="text-zinc-500 block mb-1">Inputs:</span>
                                <pre className="text-zinc-300 overflow-x-auto max-h-32">
                                  {JSON.stringify(step.inputs, null, 2)}
                                </pre>
                              </div>
                              <div className="card-glass p-2 rounded-lg">
                                <span className="text-zinc-500 block mb-1">Output:</span>
                                <pre className="text-emerald-400 overflow-x-auto max-h-32">
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

          {/* TAB 2: RESULTS */}
          {activeTab === 'result' && taskResult && (
            <div className="space-y-4">
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

              <div className="p-4 rounded-xl card-glass space-y-2">
                <h3 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Synthesized Output</span>
                </h3>
                <div className="prose prose-invert prose-xs max-w-none text-zinc-200 leading-relaxed font-sans select-text">
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

              {taskResult.actionsTaken && taskResult.actionsTaken.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    Execution Audit ({taskResult.actionsTaken.length} Actions)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {taskResult.actionsTaken.map((act: ActionAuditItem, idx: number) => (
                      <div key={idx} className="p-2.5 card-glass rounded-xl text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="text-indigo-400 text-[11px]">{act.canonicalId}</span>
                          <span className="text-emerald-400 text-[10px]">{act.latencyMs}ms</span>
                        </div>
                        <p className="text-zinc-300 text-[11px] font-sans">{act.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="p-3.5 rounded-xl card-glass font-mono text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--surface-border)] text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Kernel Telemetry</span>
                </span>
                <span className="text-[10px]">{events.length} Events</span>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                {events.map((ev: WorkflowEvent, idx: number) => (
                  <div key={idx} className="p-2 rounded-lg card-glass text-[11px] leading-relaxed">
                    <div className="flex items-center justify-between text-zinc-500 mb-0.5 text-[10px]">
                      <span className="text-indigo-400 font-bold">{ev.step}</span>
                      <span>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : ''}</span>
                    </div>
                    <div className="text-zinc-300 font-sans">
                      {ev.message}
                    </div>
                    {ev.payload && (
                      <pre className="mt-1 text-[10px] text-zinc-400 overflow-x-auto p-1.5 rounded card-glass">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Minimal Footer */}
        <div className="px-6 py-3 border-t border-[var(--surface-border)] flex items-center justify-between bg-black/20">
          <span className="text-[10px] font-mono text-zinc-500">
            Swytchcode Security Kernel Active
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 card-glass hover:border-zinc-500 text-white text-xs font-mono rounded-xl cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExecutionView;
