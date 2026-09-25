import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Compass,
  Layers,
  ShieldCheck,
  Terminal,
  Sparkles,
  AlertCircle,
  Clock,
  RefreshCw,
  CheckCircle2,
  FileText,
  Mail,
  CloudSun,
  ChevronRight,
  Database,
  Check,
  X,
  Play,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface WorkflowEvent {
  step: string;
  status: 'pending' | 'in_progress' | 'success' | 'warning' | 'error' | 'awaiting_confirmation';
  message: string;
  timestamp: string;
  payload?: any;
}

interface ConfirmationRequest {
  confirmationId: string;
  stepId: string;
  canonicalId: string;
  actionDescription: string;
  targetResource: string;
  parameters: Record<string, any>;
  severity: 'low' | 'medium' | 'high';
}

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  events?: WorkflowEvent[];
  result?: any;
  confirmationRequest?: ConfirmationRequest;
  error?: string;
  isStreaming?: boolean;
}

const QUICK_PROMPTS = [
  {
    label: '🌦️ Weather Intelligence',
    text: 'Check the 3-day weather in Jaipur and prepare an adaptive activity plan.',
  },
  {
    label: '📝 Notion Workspace Page',
    text: "Create a project workspace page in Notion titled 'Q4 AI Integration Roadmap' with key deliverables.",
  },
  {
    label: '✉️ Email Dispatch',
    text: 'Send a release announcement email to team@swytchcode.dev regarding Version 2.0 deployment.',
  },
  {
    label: '🔄 Multi-Step Workflow',
    text: 'Check the weather in Tokyo for tomorrow, summarize recommendations, and draft a Notion trip page.',
  },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome_1',
      sender: 'agent',
      text: `👋 **Welcome to the Swytchcode Autonomous Action Agent!**\n\nI am a **general-purpose autonomous integration agent** powered by **Google Gemini** for reasoning and **Swytchcode** as the authoritative API execution kernel.\n\n### What I can do:\n- 🔍 **Dynamically discover** verified capabilities from Swytchcode's integration registry\n- 🛡️ **Validate methods** against local \`.swytchcode/tooling.json\` security policies\n- 🚦 **Gate consequential actions** (emails, page creations) behind human-in-the-loop confirmation\n- ⚡ **Execute real-world workflows** across weather, Notion, Resend, and more\n- 📊 **Synthesize structured outputs** and provide full auditability`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [activeTabs, setActiveTabs] = useState<Record<string, 'response' | 'audit' | 'trace'>>({});
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [availableTools, setAvailableTools] = useState<Record<string, any>>({});

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch health & registered tools on mount
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(data => setSystemHealth(data))
      .catch(() => {});

    fetch('/api/tools')
      .then(r => r.json())
      .then(data => setAvailableTools(data.tools || {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const getActiveTab = (msgId: string) => activeTabs[msgId] || 'response';

  const setTabForMessage = (msgId: string, tab: 'response' | 'audit' | 'trace') => {
    setActiveTabs(prev => ({ ...prev, [msgId]: tab }));
  };

  const handleSendMessage = async (textToSend?: string, bypassAutoApprove?: boolean) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setInputMessage('');
    const userMsgId = `user_${Date.now()}`;
    const agentMsgId = `agent_${Date.now()}`;

    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const initialAgentMsg: Message = {
      id: agentMsgId,
      sender: 'agent',
      text: 'Initializing autonomous reasoning...',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      events: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, initialAgentMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          message: query,
          stream: true,
          autoApproveSideEffects: bypassAutoApprove !== undefined ? bypassAutoApprove : autoApprove,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const currentEvents: WorkflowEvent[] = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'step' && data.event) {
                currentEvents.push(data.event);
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId
                      ? {
                          ...m,
                          text: data.event.message,
                          events: [...currentEvents],
                        }
                      : m
                  )
                );
              } else if (data.type === 'result' && data.result) {
                const finalResult = data.result;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId
                      ? {
                          ...m,
                          text:
                            finalResult.taskResult?.markdown ||
                            (finalResult.error
                              ? `⚠️ ${finalResult.error}`
                              : finalResult.confirmationRequest
                              ? `Action requires confirmation before proceeding.`
                              : 'Autonomous task completed.'),
                          events: finalResult.events || currentEvents,
                          result: finalResult,
                          confirmationRequest: finalResult.confirmationRequest,
                          error: finalResult.error,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              } else if (data.type === 'error') {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === agentMsgId
                      ? {
                          ...m,
                          text: `⚠️ Execution Error: ${data.error}`,
                          error: data.error,
                          isStreaming: false,
                        }
                      : m
                  )
                );
              }
            } catch (err) {
              // skip non-json frames
            }
          }
        }
      }
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === agentMsgId
            ? {
                ...m,
                text: `⚠️ Failed to connect to backend: ${err.message}`,
                error: err.message,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmationAction = async (msgId: string, approved: boolean) => {
    const targetMsg = messages.find(m => m.id === msgId);
    if (!targetMsg || !targetMsg.confirmationRequest) return;

    const conf = targetMsg.confirmationRequest;
    setIsLoading(true);

    // Update message state
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId
          ? {
              ...m,
              text: approved ? 'Executing confirmed action in Swytchcode...' : 'Action was declined by user.',
              confirmationRequest: undefined,
              isStreaming: approved,
            }
          : m
      )
    );

    if (!approved) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: targetMsg.result?.userMessage || targetMsg.text,
          confirmationId: conf.confirmationId,
          approved: true,
        }),
      });

      const result = await response.json();
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                text: result.taskResult?.markdown || result.error || 'Action executed successfully.',
                result,
                events: result.events || m.events,
                error: result.error,
                isStreaming: false,
              }
            : m
        )
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId
            ? {
                ...m,
                text: `⚠️ Error executing confirmed action: ${err.message}`,
                error: err.message,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'understanding':
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'discovering':
        return <Layers className="w-4 h-4 text-amber-400" />;
      case 'planning':
        return <Database className="w-4 h-4 text-indigo-400" />;
      case 'validating':
        return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
      case 'awaiting_confirmation':
        return <AlertCircle className="w-4 h-4 text-amber-500 animate-bounce" />;
      case 'executing':
        return <Terminal className="w-4 h-4 text-orange-400" />;
      case 'synthesizing':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    }
  };

  const toolCount = Object.keys(availableTools).length;

  return (
    <div className="flex flex-col h-screen bg-[#0A0E17] text-gray-100 antialiased overflow-hidden font-sans">
      {/* TOP HEADER */}
      <header className="h-16 border-b border-gray-800/80 bg-[#0D1322]/90 backdrop-blur px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-purple-500/20 font-bold text-white text-base">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="font-semibold text-base text-gray-100 tracking-tight">
                Swytchcode Autonomous Action Agent
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                Kernel Live
              </span>
            </div>
            <p className="text-xs text-gray-400">
              General-Purpose Intent Reasoning • Swytchcode Execution Target • Safe Action Gating
            </p>
          </div>
        </div>

        {/* STATUS BADGES & TOGGLES */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gemini 2.5 Flash</span>
          </div>

          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-300">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {toolCount > 0 ? `${toolCount} Verified Tools` : 'Swytchcode v2.20.4'}
            </span>
          </div>

          {/* AUTO-APPROVE TOGGLE */}
          <button
            onClick={() => setAutoApprove(!autoApprove)}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border transition text-xs font-medium ${
              autoApprove
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700'
            }`}
            title="Toggle whether consequential side-effects require human confirmation"
          >
            <span
              className={`w-2 h-2 rounded-full ${autoApprove ? 'bg-amber-400 animate-pulse' : 'bg-gray-600'}`}
            ></span>
            <span>Auto-Approve: {autoApprove ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setMessages([messages[0]])}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition"
            title="Reset Chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* QUICK PROMPT CHIPS */}
      <div className="bg-[#090D15] border-b border-gray-800/60 px-6 py-2.5 flex items-center space-x-2.5 overflow-x-auto text-xs shrink-0">
        <span className="text-gray-400 flex items-center font-medium shrink-0 mr-1">
          <Play className="w-3 h-3 mr-1 text-indigo-400" /> Actions:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(prompt.text)}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-[#111726] border border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800 text-gray-300 transition text-left truncate max-w-sm disabled:opacity-50 flex items-center space-x-1.5"
          >
            <span className="font-medium text-gray-200">{prompt.label}:</span>
            <span className="text-gray-400 truncate">{prompt.text}</span>
          </button>
        ))}
      </div>

      {/* MAIN CHAT STREAM CONTAINER */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-4xl mx-auto`}
          >
            {/* SENDER LABEL & TIMESTAMP */}
            <div className="flex items-center space-x-2 mb-1.5 px-1 text-[11px] text-gray-400">
              <span className="font-semibold text-gray-300">
                {msg.sender === 'user' ? 'You' : 'Swytchcode Autonomous Agent'}
              </span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* MESSAGE BODY */}
            {msg.sender === 'user' ? (
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-md text-sm leading-relaxed max-w-2xl font-medium">
                {msg.text}
              </div>
            ) : (
              <div className="w-full bg-[#101625] border border-gray-800/80 rounded-2xl rounded-tl-sm p-5 shadow-xl text-sm leading-relaxed space-y-4">
                {/* 1. WORKFLOW STEPPER TRACE */}
                {msg.events && msg.events.length > 0 && (
                  <div className="bg-[#090D16] border border-gray-800/80 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-300 border-b border-gray-800 pb-2">
                      <span className="flex items-center">
                        <Layers className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
                        Autonomous Capability & Kernel Trace
                      </span>
                      {msg.isStreaming && (
                        <span className="flex items-center text-amber-400 text-[11px] animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5"></span>
                          Reasoning & Executing in Swytchcode...
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      {msg.events.map((ev, eIdx) => (
                        <div key={eIdx} className="flex items-start space-x-2.5 text-xs">
                          <div className="mt-0.5 shrink-0">{getStepIcon(ev.step)}</div>
                          <div className="flex-1">
                            <p className="text-gray-300 font-medium">{ev.message}</p>
                            {ev.payload && ev.step === 'discovering' && ev.payload.capabilities && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {ev.payload.capabilities.map((c: any, cIdx: number) => (
                                  <span
                                    key={cIdx}
                                    className="px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px] font-mono text-amber-300"
                                  >
                                    {c.canonical_id} <span className="text-gray-400">({c.summary})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. HUMAN CONFIRMATION CARD (For Consequential Actions) */}
                {msg.confirmationRequest && (
                  <div className="bg-amber-950/25 border-2 border-amber-500/50 rounded-xl p-4.5 space-y-3 shadow-lg">
                    <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                      <AlertCircle className="w-5 h-5 text-amber-400 animate-pulse" />
                      <span>Action Confirmation Required</span>
                    </div>

                    <p className="text-xs text-amber-200/90 leading-relaxed">
                      The autonomous agent is preparing to execute a consequential side-effecting action via Swytchcode:{' '}
                      <strong className="text-white">{msg.confirmationRequest.actionDescription}</strong>
                    </p>

                    <div className="p-3 bg-black/60 rounded-lg border border-amber-500/30 text-xs font-mono space-y-1">
                      <div className="text-gray-400">
                        Canonical Tool: <span className="text-amber-300">{msg.confirmationRequest.canonicalId}</span>
                      </div>
                      <div className="text-gray-400">
                        Target Resource:{' '}
                        <span className="text-emerald-300">{msg.confirmationRequest.targetResource}</span>
                      </div>
                      <details className="mt-2 text-gray-500">
                        <summary className="cursor-pointer text-amber-400 hover:text-amber-300 text-[11px]">
                          Inspect Action Parameters
                        </summary>
                        <pre className="mt-1 p-2 bg-gray-950 text-cyan-300 text-[10px] rounded overflow-x-auto">
                          {JSON.stringify(msg.confirmationRequest.parameters, null, 2)}
                        </pre>
                      </details>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <button
                        onClick={() => handleConfirmationAction(msg.id, true)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow transition flex items-center space-x-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve & Execute via Swytchcode</span>
                      </button>
                      <button
                        onClick={() => handleConfirmationAction(msg.id, false)}
                        className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs transition flex items-center space-x-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Decline Action</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. RESULT TABS & AUDIT TRAIL */}
                {msg.result?.taskResult ? (
                  <div className="space-y-4 pt-1">
                    {/* TAB SELECTORS */}
                    <div className="flex border-b border-gray-800 space-x-4 text-xs font-medium">
                      <button
                        onClick={() => setTabForMessage(msg.id, 'response')}
                        className={`pb-2.5 flex items-center space-x-1.5 transition border-b-2 ${
                          getActiveTab(msg.id) === 'response'
                            ? 'border-indigo-500 text-indigo-400 font-semibold'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Executive Response</span>
                      </button>

                      <button
                        onClick={() => setTabForMessage(msg.id, 'audit')}
                        className={`pb-2.5 flex items-center space-x-1.5 transition border-b-2 ${
                          getActiveTab(msg.id) === 'audit'
                            ? 'border-indigo-500 text-indigo-400 font-semibold'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Action Audit Trail ({msg.result.taskResult.actionsTaken?.length || 0})</span>
                      </button>

                      <button
                        onClick={() => setTabForMessage(msg.id, 'trace')}
                        className={`pb-2.5 flex items-center space-x-1.5 transition border-b-2 ${
                          getActiveTab(msg.id) === 'trace'
                            ? 'border-indigo-500 text-indigo-400 font-semibold'
                            : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <Terminal className="w-3.5 h-3.5" />
                        <span>Swytchcode Raw Payloads</span>
                      </button>
                    </div>

                    {/* TAB 1: EXECUTIVE RESPONSE (MARKDOWN) */}
                    {getActiveTab(msg.id) === 'response' && (
                      <div className="prose prose-invert prose-sm max-w-none text-gray-200 leading-relaxed space-y-3">
                        <ReactMarkdown>{msg.result.taskResult.markdown}</ReactMarkdown>
                      </div>
                    )}

                    {/* TAB 2: ACTION AUDIT TRAIL */}
                    {getActiveTab(msg.id) === 'audit' && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2.5">
                          {msg.result.taskResult.actionsTaken?.map((action: any, aIdx: number) => (
                            <div
                              key={aIdx}
                              className="p-3.5 bg-[#0A0F1A] border border-gray-800 rounded-xl flex items-center justify-between"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono text-xs font-bold text-amber-400">
                                    {action.canonicalId}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono">
                                    {action.integration}
                                  </span>
                                  <span
                                    className={`text-[10px] px-2 py-0.5 rounded ${
                                      action.status === 'success'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-red-500/10 text-red-400'
                                    }`}
                                  >
                                    {action.status.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-300">{action.description}</p>
                              </div>

                              <div className="text-right text-xs font-mono text-gray-400">
                                <div>{action.latencyMs}ms</div>
                                <span className="text-[10px] text-gray-500">
                                  {action.isMocked ? 'Sandbox' : 'Live Kernel'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: SWYTCHCODE RAW TRACE */}
                    {getActiveTab(msg.id) === 'trace' && (
                      <div className="space-y-3 font-mono text-xs">
                        <div className="p-3 bg-black/70 border border-gray-800 rounded-xl space-y-2">
                          <div className="text-gray-400 text-[11px] border-b border-gray-800 pb-1.5">
                            Plan ID: <strong className="text-indigo-400">{msg.result.plan?.planId}</strong>
                          </div>
                          <pre className="text-[11px] text-cyan-300 overflow-x-auto">
                            {JSON.stringify(
                              {
                                goal: msg.result.goalAnalysis,
                                plan: msg.result.plan,
                                structuredData: msg.result.taskResult.structuredData,
                              },
                              null,
                              2
                            )}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Simple text / ongoing status
                  !msg.confirmationRequest && (
                    <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {msg.text}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* INPUT BAR */}
      <div className="border-t border-gray-800/80 bg-[#0D1322]/90 backdrop-blur p-4 shrink-0">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="max-w-4xl mx-auto flex items-center space-x-3"
        >
          <input
            type="text"
            value={inputMessage}
            disabled={isLoading}
            onChange={e => setInputMessage(e.target.value)}
            placeholder="Describe any real-world task (e.g. 'Check weather in Tokyo and draft a Notion trip page')..."
            className="flex-1 bg-gray-900/90 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-100 placeholder-gray-500 text-sm rounded-xl px-4 py-3 outline-none transition disabled:opacity-50 font-normal"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-2 shrink-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing...</span>
              </>
            ) : (
              <>
                <span>Run</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
