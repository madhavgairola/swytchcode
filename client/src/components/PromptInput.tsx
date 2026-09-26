import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  ArrowUp,
  Mail,
  MessageSquare,
  BookOpen,
  Folder,
  Database,
  GitBranch,
  Calendar,
  Sparkles
} from 'lucide-react';
import { WorkContext } from '../types/graph.js';

interface PromptInputProps {
  onSubmit: (prompt: string, autoApprove: boolean) => void;
  isLoading: boolean;
  activeContext?: WorkContext;
  onOpenSettings?: () => void;
}

const ASSISTANT_STARTER_PROMPTS = [
  {
    icon: <Sparkles className="w-3 h-3 text-indigo-400" />,
    label: 'All-in-One Multi-Assistant Workflow',
    prompt: 'Synthesize engineering consensus from Slack #infra with Google Drive Architecture RFC, create a structured Notion briefing page, and email the executive summary to me.',
  },
  {
    icon: <Mail className="w-3 h-3 text-sky-400" />,
    label: 'Gmail Assistant',
    prompt: 'Search Gmail mailbox for customer pilot feedback threads regarding API latency and security signoff.',
  },
  {
    icon: <GitBranch className="w-3 h-3 text-indigo-400" />,
    label: 'GitHub Assistant',
    prompt: 'List open issues and pull requests in repository swytchcode/core and create a priority summary.',
  },
  {
    icon: <Calendar className="w-3 h-3 text-pink-400" />,
    label: 'Google Calendar Assistant',
    prompt: 'List scheduled calendar events for this week and check for conflicting meetings.',
  },
  {
    icon: <MessageSquare className="w-3 h-3 text-emerald-400" />,
    label: 'Slack Assistant',
    prompt: 'Fetch the latest discussions in Slack #infra and summarize team consensus on zero-trust vault memory caching.',
  },
  {
    icon: <BookOpen className="w-3 h-3 text-purple-400" />,
    label: 'Notion Assistant',
    prompt: 'Create a structured Notion documentation page for Architecture 2026 with system overview, security boundaries, and milestone checklist.',
  },
  {
    icon: <Folder className="w-3 h-3 text-amber-400" />,
    label: 'Google Drive Assistant',
    prompt: 'Search Google Drive for Architecture 2026 RFC and security specification documents.',
  },
  {
    icon: <Database className="w-3 h-3 text-orange-400" />,
    label: 'Box Assistant',
    prompt: 'Retrieve the 2026 SOC-2 Type II audit report and customer DPA compliance package from Box storage.',
  },
];

export const PromptInput: React.FC<PromptInputProps> = ({
  onSubmit,
  isLoading,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [autoApprove, setAutoApprove] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSubmit(prompt.trim(), autoApprove);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 pb-3">
      {/* 5 AI Assistant Quick Action Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {ASSISTANT_STARTER_PROMPTS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(item.prompt);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1 card-glass hover:border-zinc-500 text-zinc-300 hover:text-white rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Main Minimal Glowing Prompt Box */}
      <div className="relative rounded-2xl card-glass border border-[var(--surface-border)] hover:border-zinc-600 focus-within:border-zinc-500 shadow-2xl transition-all p-3">
        
        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask RECALL to investigate, synthesize, or execute actions across Gmail, Slack, Notion, Google Drive, Box, GitHub, Google Calendar..."
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-zinc-500 resize-none focus:outline-none leading-relaxed custom-scrollbar max-h-32 block px-1"
        />

        {/* Action Toolbar Inside Box */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--surface-border)] mt-2">
          
          {/* Left: Auto-confirm toggle */}
          <label className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer select-none transition-colors">
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-[11px] font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Auto-confirm safe actions
            </span>
          </label>

          {/* Right: Submit Button */}
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || !prompt.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
            title="Execute Workflow"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>

        </div>

      </div>
    </div>
  );
};

export default PromptInput;
