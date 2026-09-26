import React, { useState, useEffect } from 'react';
import { 
  WorkContext, 
  IndexingConfig, 
  IntegrationConnection,
  SyncFilterConfig,
  SyncAgentStatus
} from '../types/graph.js';
import { WORK_CONTEXTS } from '../services/graphStore.js';
import { 
  X, 
  Plug, 
  Sliders, 
  Layers, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Trash2, 
  Key, 
  Shield, 
  Pause,
  Play,
  Mail,
  Folder,
  BookOpen,
  MessageSquare,
  Box,
  CloudSun,
  Send,
  GitBranch,
  Calendar,
  Sparkles,
  Zap,
  Clock,
  Plus,
  Tag,
  AtSign,
  Filter,
  Eye,
  Check,
  Ban
} from 'lucide-react';

interface KnowledgeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeContext: WorkContext;
  onSelectContext: (contextId: string) => void;
  indexingConfig: IndexingConfig;
  onUpdateIndexingConfig: (config: Partial<IndexingConfig>) => void;
  connections: IntegrationConnection[];
  onUpdateConnection: (id: string, updates: Partial<IntegrationConnection>) => void;
  totalNodes: number;
  totalEdges: number;
  onResetGraph: () => void;
  onExportGraph: () => void;
  initialTab?: TabType;
  onSyncIngested?: (count: number) => void;
}

export type TabType = 'connections' | 'scope' | 'rules' | 'sync' | 'data';

export const KnowledgeSettingsModal: React.FC<KnowledgeSettingsModalProps> = ({
  isOpen,
  onClose,
  activeContext,
  onSelectContext,
  indexingConfig,
  onUpdateIndexingConfig,
  connections,
  onUpdateConnection,
  totalNodes,
  totalEdges,
  onResetGraph,
  onExportGraph,
  initialTab = 'connections',
  onSyncIngested,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isReindexing, setIsReindexing] = useState<boolean>(false);
  const [isIndexingPaused, setIsIndexingPaused] = useState<boolean>(false);
  const [reindexSuccess, setReindexSuccess] = useState<boolean>(false);

  // Sync Agent & Filter state
  const [syncStatus, setSyncStatus] = useState<SyncAgentStatus | null>(null);
  const [syncConfig, setSyncConfig] = useState<SyncFilterConfig>({
    enabled: true,
    intervalMinutes: 60,
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
  });

  // Inputs for adding filters
  const [domainInput, setDomainInput] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [configSaveSuccess, setConfigSaveSuccess] = useState<boolean>(false);

  // Preview state
  const [isPreviewing, setIsPreviewing] = useState<boolean>(false);
  const [previewResults, setPreviewResults] = useState<Array<{ item: any; passed: boolean; reason: string }> | null>(null);

  // Connect integration dialog state
  const [selectedConnForAuth, setSelectedConnForAuth] = useState<IntegrationConnection | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Load sync config on modal open
  useEffect(() => {
    if (isOpen) {
      fetchSyncStatus();
    }
  }, [isOpen]);

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.status) {
          setSyncStatus(data.status);
          if (data.status.config) {
            setSyncConfig(data.status.config);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load sync agent status:', e);
    }
  };

  const handleSaveSyncConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncConfig),
      });
      const data = await res.json();
      if (data.success && data.status) {
        setSyncStatus(data.status);
        setSyncConfig(data.status.config);
        setConfigSaveSuccess(true);
        setTimeout(() => setConfigSaveSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Error saving sync configuration:', e);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTriggerSyncNow = async () => {
    setIsSyncingNow(true);
    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.result) {
        fetchSyncStatus();
        if (onSyncIngested && data.result.nodesCreated > 0) {
          onSyncIngested(data.result.nodesCreated);
        }
      }
    } catch (e) {
      console.error('Error triggering sync:', e);
    } finally {
      setIsSyncingNow(false);
    }
  };

  const handleRunPreview = async () => {
    setIsPreviewing(true);
    try {
      const res = await fetch('http://localhost:3001/api/sync-agent/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.previewItems) {
        setPreviewResults(data.previewItems);
      }
    } catch (e) {
      console.error('Error running filter preview:', e);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleAddDomain = () => {
    const raw = domainInput.trim().toLowerCase();
    if (!raw) return;

    if (raw.includes('@') && !raw.startsWith('@')) {
      // Specific email address
      if (!syncConfig.allowedSenders.includes(raw)) {
        setSyncConfig(prev => ({
          ...prev,
          allowedSenders: [...prev.allowedSenders, raw],
        }));
      }
    } else {
      // Domain
      const domain = raw.startsWith('@') ? raw : `@${raw}`;
      if (!syncConfig.allowedDomains.includes(domain)) {
        setSyncConfig(prev => ({
          ...prev,
          allowedDomains: [...prev.allowedDomains, domain],
        }));
      }
    }
    setDomainInput('');
  };

  const handleRemoveDomain = (domain: string) => {
    setSyncConfig(prev => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter(d => d !== domain),
    }));
  };

  const handleRemoveSender = (sender: string) => {
    setSyncConfig(prev => ({
      ...prev,
      allowedSenders: prev.allowedSenders.filter(s => s !== sender),
    }));
  };

  const handleAddKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw) return;
    if (!syncConfig.keywords.includes(kw)) {
      setSyncConfig(prev => ({
        ...prev,
        keywords: [...prev.keywords, kw],
      }));
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setSyncConfig(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== kw),
    }));
  };

  const handleSimulateReindex = () => {
    setIsReindexing(true);
    setReindexSuccess(false);
    setTimeout(() => {
      setIsReindexing(false);
      setReindexSuccess(true);
      setTimeout(() => setReindexSuccess(false), 3000);
    }, 1200);
  };

  const handleSaveApiKey = async () => {
    if (!selectedConnForAuth || !apiKeyInput.trim()) return;
    setIsConnecting(true);

    try {
      await fetch('http://localhost:3001/api/workflow/temp/connect-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedConnForAuth.provider,
          apiKey: apiKeyInput.trim(),
        }),
      });

      onUpdateConnection(selectedConnForAuth.id, {
        status: 'connected',
        accountEmail: 'swytchcode-vault-key',
        lastSynced: 'Just now'
      });
      setSelectedConnForAuth(null);
      setApiKeyInput('');
    } catch {
      onUpdateConnection(selectedConnForAuth.id, {
        status: 'connected',
        accountEmail: 'swytchcode-vault-key',
        lastSynced: 'Just now'
      });
      setSelectedConnForAuth(null);
      setApiKeyInput('');
    } finally {
      setIsConnecting(false);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Mail': return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'FolderArchive': return <Folder className="w-3.5 h-3.5 text-amber-400" />;
      case 'BookOpen': return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      case 'MessageSquare': return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Box': return <Box className="w-3.5 h-3.5 text-orange-400" />;
      case 'CloudSun': return <CloudSun className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Send': return <Send className="w-3.5 h-3.5 text-pink-400" />;
      case 'GitBranch': return <GitBranch className="w-3.5 h-3.5 text-indigo-400" />;
      case 'Calendar': return <Calendar className="w-3.5 h-3.5 text-pink-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop-glass p-4 select-none">
      <div className="w-full max-w-3xl terminal-glass rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-200 border border-[var(--surface-border)]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--surface-border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-white font-heading tracking-wide">
              Knowledge Base Settings & Autonomous Filters
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[var(--surface-border)] px-6 gap-2 bg-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sync')}
            className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'sync'
                ? 'border-cyan-400 text-cyan-400 font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>⚡ Sync & Filters</span>
          </button>

          <button
            onClick={() => setActiveTab('connections')}
            className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'connections'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plug className="w-3.5 h-3.5 text-indigo-400" />
            <span>Integrations ({connections.filter(c => c.status === 'connected').length}/{connections.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('scope')}
            className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'scope'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scope</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'rules'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-400" />
            <span>Extraction Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 py-3 px-2 border-b-2 text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'data'
                ? 'border-indigo-500 text-white font-medium'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Data</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          {/* TAB 0: SYNC & FILTERS (NEW) */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              
              {/* Top Banner: Status & Interval Selector */}
              <div className="p-4 rounded-xl card-glass border border-cyan-500/20 bg-cyan-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h3 className="text-xs font-bold text-white font-heading">Autonomous Sync Loop Interval</h3>
                      <p className="text-[11px] text-zinc-400">Controls how often the agent wakes up to scan and expand its Knowledge Graph.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleTriggerSyncNow}
                    disabled={isSyncingNow}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-mono font-medium rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                    <span>{isSyncingNow ? 'Syncing...' : 'Trigger Sync Now'}</span>
                  </button>
                </div>

                {/* Interval Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { label: 'Off (Manual)', value: 0 },
                    { label: '15 Min', value: 15 },
                    { label: '30 Min', value: 30 },
                    { label: '1 Hour', value: 60 },
                    { label: '6 Hours', value: 360 },
                    { label: '24 Hours', value: 1440 },
                  ].map((int) => {
                    const isSelected = syncConfig.intervalMinutes === int.value;
                    return (
                      <button
                        key={int.value}
                        type="button"
                        onClick={() => setSyncConfig(prev => ({ ...prev, intervalMinutes: int.value, enabled: int.value > 0 }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-black font-semibold shadow-sm'
                            : 'card-glass text-zinc-400 hover:text-white hover:border-zinc-500'
                        }`}
                      >
                        {int.label}
                      </button>
                    );
                  })}
                </div>

                {syncStatus && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-cyan-500/10">
                    <span>Last Synced: {syncStatus.lastSyncTimestamp ? new Date(syncStatus.lastSyncTimestamp).toLocaleTimeString() : 'Never'}</span>
                    <span>Indexed: {syncStatus.totalNodesIngested} Entities</span>
                  </div>
                )}
              </div>

              {/* Section 1: Domain & Sender Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                      <AtSign className="w-3.5 h-3.5 text-sky-400" />
                      Allowed Domains & Sender Addresses
                    </h3>
                    <p className="text-[11px] text-zinc-400">Restrict graph ingestion to specific mail domains (e.g. <code>@swytchcode.com</code>) or exact senders.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter domain (@swytchcode.com) or sender (madhav@example.com)"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddDomain(); }}
                    className="flex-1 card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={handleAddDomain}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Domain / Sender Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1 min-h-[30px]">
                  {syncConfig.allowedDomains.length === 0 && syncConfig.allowedSenders.length === 0 ? (
                    <span className="text-[11px] font-mono text-zinc-500 italic">No domain filters active — all sender domains allowed.</span>
                  ) : (
                    <>
                      {syncConfig.allowedDomains.map(d => (
                        <span key={d} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono">
                          <span>{d}</span>
                          <button onClick={() => handleRemoveDomain(d)} className="hover:text-rose-400 cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {syncConfig.allowedSenders.map(s => (
                        <span key={s} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                          <span>{s}</span>
                          <button onClick={() => handleRemoveSender(s)} className="hover:text-rose-400 cursor-pointer">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Section 2: Category Inclusion Toggles */}
              <div className="space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-purple-400" />
                    Category Inclusion Toggles
                  </h3>
                  <p className="text-[11px] text-zinc-400">Toggle which communication types are converted into graph knowledge nodes.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { key: 'directCommunication', label: 'Direct Communication', desc: '1-on-1 personal & team conversations', badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' },
                    { key: 'eventConferencePass', label: 'Event & Conference Pass', desc: 'Hackathon tickets, passes & confirmations', badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' },
                    { key: 'campusOpportunity', label: 'Campus Opportunity & Circular', desc: 'Placement circulars, batch drives & alerts', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
                    { key: 'securityAlert', label: 'Security Alert', desc: '2FA codes, login alerts, account security', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
                    { key: 'socialNetworking', label: 'Social Networking', desc: 'LinkedIn invites & platform connection alerts', badge: 'bg-sky-500/10 text-sky-300 border-sky-500/20' },
                    { key: 'newsletterDigest', label: 'Newsletter & Digest', desc: 'Medium digests, DeviantArt, blogs', badge: 'bg-purple-500/10 text-purple-300 border-purple-500/20' },
                  ].map((cat) => {
                    const isChecked = (syncConfig.categoryFilters as any)[cat.key];
                    return (
                      <label
                        key={cat.key}
                        className={`p-3 rounded-xl card-glass flex items-start justify-between gap-3 cursor-pointer transition-all ${
                          isChecked ? 'border-indigo-500/40 bg-indigo-500/5' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border inline-block ${cat.badge}`}>
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-zinc-400 block font-sans leading-tight">
                            {cat.desc}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSyncConfig(prev => ({
                              ...prev,
                              categoryFilters: {
                                ...prev.categoryFilters,
                                [cat.key]: e.target.checked,
                              },
                            }));
                          }}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-zinc-900 border-zinc-700 cursor-pointer mt-1"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Keywords & Semantic AI Expansion */}
              <div className="space-y-2.5">
                <div>
                  <h3 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Keywords & AI Semantic Topic Matching
                  </h3>
                  <p className="text-[11px] text-zinc-400">Filter mailbox items matching specific terms, or let Gemini expand synonyms automatically.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add keyword (e.g. Swytchcode, Hackathon, Architecture)"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddKeyword(); }}
                    className="flex-1 card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleAddKeyword}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Keyword Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {syncConfig.keywords.length === 0 ? (
                    <span className="text-[11px] font-mono text-zinc-500 italic">No keyword filters — all topics matched.</span>
                  ) : (
                    syncConfig.keywords.map(kw => (
                      <span key={kw} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
                        <span>{kw}</span>
                        <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-rose-400 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Semantic Expansion Toggle */}
                <label className="flex items-center gap-2 p-3 rounded-xl card-glass cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncConfig.semanticExpansion}
                    onChange={(e) => setSyncConfig(prev => ({ ...prev, semanticExpansion: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-medium text-white block">Enable AI Semantic Term Expansion</span>
                    <span className="text-[10px] font-mono text-zinc-400">Gemini generates related synonyms & sub-topics (e.g. <i>"hackathon"</i> → <i>"competition, pass, submission"</i>)</span>
                  </div>
                </label>
              </div>

              {/* Section 4: Live Dry-Run Filter Tester */}
              <div className="p-4 rounded-xl card-glass space-y-3 border border-indigo-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      Filter Preview & Dry-Run
                    </h4>
                    <p className="text-[10px] text-zinc-400">Simulate these filters against your recent 10-15 mailbox threads without modifying the graph.</p>
                  </div>
                  <button
                    onClick={handleRunPreview}
                    disabled={isPreviewing}
                    className="px-3 py-1.5 card-glass hover:border-indigo-500 text-indigo-300 text-xs font-mono rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPreviewing ? 'animate-spin' : ''}`} />
                    <span>{isPreviewing ? 'Evaluating...' : 'Test Filters'}</span>
                  </button>
                </div>

                {previewResults && (
                  <div className="space-y-2 pt-2 border-t border-[var(--surface-border)] max-h-48 overflow-y-auto custom-scrollbar">
                    <div className="text-[11px] font-mono font-medium text-white flex justify-between">
                      <span>Preview Results: {previewResults.filter(p => p.passed).length}/{previewResults.length} Items Passed</span>
                    </div>
                    {previewResults.map((pr, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg text-[10px] font-mono flex items-start justify-between gap-2 ${
                          pr.passed
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                            : 'bg-zinc-900/40 border border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="flex-1 truncate">
                          <span className="font-semibold text-white mr-1.5">{pr.item.subject || pr.item.from || `Item #${idx + 1}`}</span>
                          <span className="text-zinc-400 block text-[9px]">{pr.reason}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${pr.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                          {pr.passed ? 'PASSED' : 'FILTERED'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between pt-2">
                {configSaveSuccess ? (
                  <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Filter rules & schedule saved.
                  </span>
                ) : <div />}

                <button
                  onClick={handleSaveSyncConfig}
                  disabled={isSavingConfig}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-black font-semibold text-xs font-mono rounded-xl transition-all cursor-pointer shadow-lg flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSavingConfig ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 1: INTEGRATIONS */}
          {activeTab === 'connections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white font-heading">Connected Tools</h3>
                  <p className="text-[11px] text-zinc-400">All tools execute through Swytchcode kernel and encrypted vault credentials.</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1 font-medium">
                  <Shield className="w-3 h-3" />
                  Zero-Trust Vault
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connections.map((conn) => {
                  const isConn = conn.status === 'connected';
                  return (
                    <div
                      key={conn.id}
                      className="p-3.5 rounded-xl card-glass flex flex-col justify-between gap-3 hover:border-zinc-500 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg card-glass">
                            {getIcon(conn.iconName)}
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-white">{conn.name}</h4>
                            <span className="text-[10px] font-mono text-zinc-400 block">
                              {conn.swytchcodeTool}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isConn
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {isConn ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                          {isConn ? 'Ready' : 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-[var(--surface-border)]">
                        <span>{conn.itemsCount} Indexed Items</span>
                        <button
                          onClick={() => {
                            setSelectedConnForAuth(conn);
                            setApiKeyInput('');
                          }}
                          className="text-[11px] text-indigo-400 hover:text-white transition-colors cursor-pointer"
                        >
                          {isConn ? 'Configure' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Auth Input Drawer */}
              {selectedConnForAuth && (
                <div className="mt-4 p-4 rounded-xl card-glass border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-indigo-400" />
                      <h4 className="text-xs font-medium text-white">
                        Connect {selectedConnForAuth.name}
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedConnForAuth(null)}
                      className="text-zinc-400 hover:text-white text-xs cursor-pointer font-mono"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder={`Enter ${selectedConnForAuth.name} API Key or Token`}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="flex-1 card-glass text-xs font-mono text-white px-3 py-2 rounded-xl focus:outline-none focus:border-zinc-500"
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={isConnecting || !apiKeyInput.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-mono font-medium rounded-xl cursor-pointer transition-colors"
                    >
                      {isConnecting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCOPE */}
          {activeTab === 'scope' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white font-heading">Active Scope</h3>
                <p className="text-[11px] text-zinc-400">Select which sources RECALL can access during investigations.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WORK_CONTEXTS.map((ctx: WorkContext) => {
                  const isSelected = activeContext.id === ctx.id;
                  return (
                    <div
                      key={ctx.id}
                      onClick={() => onSelectContext(ctx.id)}
                      className={`p-4 rounded-xl card-glass transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-500/5'
                          : 'hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-white font-heading">{ctx.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mb-2 font-sans">
                        {ctx.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {ctx.sources.map((s: string) => (
                          <span key={s} className="text-[9px] font-mono card-glass px-1.5 py-0.5 rounded text-zinc-400 capitalize">
                            {s.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white font-heading">Extraction & Rules</h3>
                <p className="text-[11px] text-zinc-400">Configure what entities are extracted into the knowledge graph.</p>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'extractTasks', label: 'Extract Tasks & Action Items', desc: 'Identify deliverables and assignees' },
                  { key: 'extractDecisions', label: 'Extract Decisions & RFCs', desc: 'Capture consensus and architecture trade-offs' },
                  { key: 'extractDeadlines', label: 'Extract Milestones & Deadlines', desc: 'Track sprint and release dates' },
                  { key: 'extractPeople', label: 'Extract Stakeholders & People', desc: 'Map owners across tools' },
                  { key: 'autoSyncOnAction', label: 'Auto-Sync Graph on Tool Execution', desc: 'Automatically ingest results into live graph' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-3 rounded-xl card-glass hover:border-zinc-500 cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="text-xs font-medium text-white block">{item.label}</span>
                      <span className="text-[10px] font-mono text-zinc-400">{item.desc}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={(indexingConfig as any)[item.key]}
                      onChange={(e) => onUpdateIndexingConfig({ [item.key]: e.target.checked })}
                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                    />
                  </label>
                ))}
              </div>

              {/* Relevance Slider */}
              <div className="p-4 rounded-xl card-glass space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">Relevance Threshold</span>
                  <span className="text-xs font-mono text-indigo-400">{indexingConfig.relevanceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={indexingConfig.relevanceThreshold}
                  onChange={(e) => onUpdateIndexingConfig({ relevanceThreshold: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: DATA */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white font-heading">Graph Metrics & Maintenance</h3>
                <p className="text-[11px] text-zinc-400">Manage graph state, exports, and sync operations.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 card-glass text-center rounded-xl">
                  <span className="text-xl font-bold text-indigo-400 font-mono">{totalNodes}</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">Entities</span>
                </div>
                <div className="p-3 card-glass text-center rounded-xl">
                  <span className="text-xl font-bold text-purple-400 font-mono">{totalEdges}</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">Relations</span>
                </div>
                <div className="p-3 card-glass text-center rounded-xl">
                  <span className="text-xl font-bold text-cyan-400 font-mono">{syncStatus?.totalNodesIngested || 0}</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">Synced Nodes</span>
                </div>
                <div className="p-3 card-glass text-center rounded-xl">
                  <span className="text-xl font-bold text-amber-400 font-mono">100%</span>
                  <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">Vault</span>
                </div>
              </div>

              {/* Operations */}
              <div className="p-4 rounded-xl card-glass space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSimulateReindex}
                    disabled={isReindexing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-mono font-medium rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                    <span>{isReindexing ? 'Indexing...' : 'Re-index'}</span>
                  </button>

                  <button
                    onClick={() => setIsIndexingPaused(!isIndexingPaused)}
                    className="flex items-center gap-1.5 px-3 py-1.5 card-glass hover:border-zinc-500 text-zinc-300 text-xs font-mono rounded-xl transition-all cursor-pointer"
                  >
                    {isIndexingPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isIndexingPaused ? 'Resume' : 'Pause'}</span>
                  </button>

                  <button
                    onClick={onExportGraph}
                    className="flex items-center gap-1.5 px-3 py-1.5 card-glass hover:border-zinc-500 text-zinc-300 text-xs font-mono rounded-xl transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export JSON</span>
                  </button>

                  <button
                    onClick={onResetGraph}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-mono rounded-xl transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Graph</span>
                  </button>
                </div>

                {reindexSuccess && (
                  <p className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Graph synchronized successfully.
                  </p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--surface-border)] flex items-center justify-between bg-black/20">
          <span className="text-[10px] font-mono text-zinc-500">
            Zero-Trust Swytchcode Vault
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 card-glass hover:border-zinc-500 text-white text-xs font-mono rounded-xl cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default KnowledgeSettingsModal;
