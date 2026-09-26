import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, ShieldCheck, Sliders, CheckCircle2, Clock } from 'lucide-react';
import { SyncAgentStatus } from '../types/graph.js';

interface SyncStatusBadgeProps {
  onOpenSettings: (tab: 'sync' | 'connections' | 'scope' | 'rules' | 'data') => void;
  onSyncCompleted?: (nodesCount: number) => void;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  onOpenSettings,
  onSyncCompleted,
}) => {
  const [status, setStatus] = useState<SyncAgentStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Fetch initial status
  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          setStatus(data.status);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch sync agent status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Subscribe to SSE stream for background sync completions
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('http://localhost:3001/api/sync-agent/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'sync_completed' && data.result) {
            fetchStatus();
            setLastMessage(`Ingested +${data.result.nodesCreated || 0} nodes`);
            if (onSyncCompleted && data.result.nodesCreated > 0) {
              onSyncCompleted(data.result.nodesCreated);
            }
            setTimeout(() => setLastMessage(null), 5000);
          }
        } catch (e) {
          console.warn('Error parsing sync SSE:', e);
        }
      };
    } catch (e) {
      console.warn('SSE connection error:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [onSyncCompleted]);

  // Trigger manual sync
  const handleTriggerSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    setLastMessage('Scanning with Swytchcode...');

    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.result) {
        const count = data.result.nodesCreated || 0;
        setLastMessage(count > 0 ? `+${count} new entities added` : 'Graph up to date');
        fetchStatus();
        if (onSyncCompleted && count > 0) {
          onSyncCompleted(count);
        }
      } else {
        setLastMessage('Sync complete');
      }
    } catch (err: any) {
      setLastMessage('Sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastMessage(null), 4000);
    }
  };

  const isEnabled = status?.enabled;
  const intervalMins = status?.intervalMinutes || 60;

  return (
    <div className="flex items-center gap-2">
      <div 
        onClick={() => onOpenSettings('sync')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl card-glass border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer shadow-lg backdrop-blur-md"
      >
        <span className="relative flex h-2 w-2">
          {isEnabled && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${isEnabled ? 'bg-cyan-500' : 'bg-zinc-600'}`}></span>
        </span>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-medium text-white tracking-wide">
              {lastMessage || (isEnabled ? `Auto-Sync (${intervalMins}m)` : 'Auto-Sync: Off')}
            </span>
          </div>
        </div>

        <button
          onClick={handleTriggerSync}
          disabled={isSyncing}
          title="Trigger immediate sync"
          className="ml-1 p-1 hover:bg-white/10 rounded-lg text-indigo-400 hover:text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings('sync');
          }}
          title="Configure Filters & Schedule"
          className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
