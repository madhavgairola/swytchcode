import React, { useState } from 'react';
import { InvestigationHistoryItem } from '../types/graph.js';
import { 
  X, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: InvestigationHistoryItem[];
  onSelectInvestigation: (item: InvestigationHistoryItem) => void;
  onNewInvestigation: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectInvestigation,
  onNewInvestigation,
}) => {
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filteredHistory = history.filter((item: InvestigationHistoryItem) =>
    item.prompt.toLowerCase().includes(search.toLowerCase()) ||
    (item.summary && item.summary.toLowerCase().includes(search.toLowerCase())) ||
    item.toolsUsed.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose} 
        className="fixed inset-0 modal-backdrop-glass transition-opacity" 
      />

      {/* Slide-out Sidebar */}
      <div className="relative w-full max-w-sm terminal-glass shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200 border-r border-[var(--surface-border)]">
        
        {/* Minimal Header */}
        <div className="p-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white font-heading tracking-wide">History</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* New Investigation Button & Search */}
        <div className="p-4 border-b border-[var(--surface-border)] space-y-3">
          <button
            onClick={() => {
              onNewInvestigation();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Investigation</span>
          </button>

          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3" />
            <input
              type="text"
              placeholder="Search history..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full card-glass text-xs font-mono text-zinc-200 pl-8 pr-3 py-1.5 rounded-xl border border-[var(--surface-border)] focus:outline-none focus:border-zinc-500 placeholder-zinc-500"
            />
          </div>
        </div>

        {/* List of Investigations */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              No previous runs found.
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isCompleted = item.status === 'COMPLETED';
              const isPaused = item.status === 'PAUSED';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectInvestigation(item);
                    onClose();
                  }}
                  className="p-3 rounded-xl card-glass hover:border-zinc-500 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isCompleted
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      {isPaused && <AlertCircle className="w-3 h-3" />}
                      {item.status}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                  </div>

                  <h4 className="text-xs font-medium text-zinc-200 group-hover:text-white line-clamp-2 mb-1 leading-snug font-sans">
                    {item.prompt}
                  </h4>

                  {item.summary && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2 font-sans">
                      {item.summary}
                    </p>
                  )}

                  {/* Tool Badges */}
                  {item.toolsUsed && item.toolsUsed.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5 border-t border-[var(--surface-border)]">
                      {item.toolsUsed.map((tool: string, idx: number) => (
                        <span key={idx} className="text-[9px] font-mono bg-white/5 text-zinc-400 px-1.5 py-0.5 rounded border border-[var(--surface-border)]">
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};

export default HistoryDrawer;
