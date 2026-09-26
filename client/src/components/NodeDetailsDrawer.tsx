import React from 'react';
import { GraphNode, GraphEdge, SourceType, NodeType, EvidenceReference } from '../types/graph.js';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Link2, 
  FileText, 
  Calendar, 
  ShieldCheck, 
  Folder, 
  MessageSquare, 
  Mail, 
  CloudSun, 
  Send, 
  BookOpen, 
  ArrowRight, 
  Database, 
  Hash,
  GitBranch 
} from 'lucide-react';

interface NodeDetailsDrawerProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onInvestigateNode: (node: GraphNode) => void;
}

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  gmail: <Mail className="w-3.5 h-3.5 text-sky-400" />,
  google_drive: <Folder className="w-3.5 h-3.5 text-amber-400" />,
  notion: <BookOpen className="w-3.5 h-3.5 text-purple-400" />,
  slack: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
  box: <Database className="w-3.5 h-3.5 text-orange-400" />,
  weatherapi: <CloudSun className="w-3.5 h-3.5 text-cyan-400" />,
  resend: <Send className="w-3.5 h-3.5 text-pink-400" />,
  github: <GitBranch className="w-3.5 h-3.5 text-indigo-400" />,
  google_calendar: <Calendar className="w-3.5 h-3.5 text-pink-400" />,
  derived: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
};

const SOURCE_LABELS: Record<SourceType, string> = {
  gmail: 'Gmail & Workspace',
  google_drive: 'Google Drive',
  notion: 'Notion Workspace',
  slack: 'Slack Enterprise',
  box: 'Box Storage',
  weatherapi: 'WeatherAPI',
  resend: 'Resend Email',
  github: 'GitHub',
  google_calendar: 'Google Calendar',
  derived: 'AI Derived',
};

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  node,
  edges,
  allNodes,
  onClose,
  onSelectNode,
  onInvestigateNode,
}) => {
  if (!node) return null;

  // Find all connected edges and corresponding target/source nodes
  const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);
  const connectedNodes = connectedEdges.map(e => {
    const otherId = e.source === node.id ? e.target : e.source;
    const otherNode = allNodes.find(n => n.id === otherId);
    return {
      edge: e,
      otherNode,
      isOutgoing: e.source === node.id
    };
  }).filter(item => item.otherNode !== undefined);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-full sm:w-[440px] terminal-glass shadow-2xl z-40 flex flex-col transition-all duration-300 border-l border-[var(--surface-border)] select-none">
      
      {/* Minimal Header */}
      <div className="p-4 border-b border-[var(--surface-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-400">
            {SOURCE_LABELS[node.source] || 'Entity'}
          </span>
          <span className="text-xs text-zinc-600">•</span>
          <span className="text-xs font-mono text-indigo-400 capitalize">
            {node.type.replace('_', ' ')}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
        
        {/* Title & Relevance */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[10px] font-mono text-zinc-500 uppercase">
              ID: {node.id}
            </span>
            {node.relevanceScore !== undefined && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3 h-3" />
                {node.relevanceScore}% Relevance
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white font-heading leading-snug">
            {node.label}
          </h2>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onInvestigateNode(node)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-medium rounded-xl shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Investigate with RECALL</span>
          </button>

          {node.externalUrl && (
            <a
              href={node.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 card-glass text-zinc-400 hover:text-white rounded-xl transition-colors flex items-center justify-center"
              title="Open Resource"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Summary Card */}
        <div className="card-glass p-4 rounded-xl space-y-2">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>Summary</span>
          </h3>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans">
            {node.summary}
          </p>
          {node.content && (
            <p className="text-xs text-zinc-300 pt-2 border-t border-[var(--surface-border)] leading-relaxed font-sans">
              {node.content}
            </p>
          )}
        </div>

        {/* Evidence References */}
        {node.evidenceReferences && node.evidenceReferences.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Evidence ({node.evidenceReferences.length})</span>
            </h3>
            <div className="space-y-2">
              {node.evidenceReferences.map((ref: EvidenceReference, idx: number) => (
                <div key={idx} className="card-glass p-3 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span className="capitalize">{ref.source.replace('_', ' ')}</span>
                    {ref.url && (
                      <a 
                        href={ref.url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-zinc-300 text-[11px] italic font-sans">
                    "{ref.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connected Graph Relationships */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Connected Nodes ({connectedNodes.length})</span>
            </span>
          </h3>

          {connectedNodes.length === 0 ? (
            <p className="text-xs font-mono text-zinc-500 italic">No direct connections recorded.</p>
          ) : (
            <div className="space-y-1.5">
              {connectedNodes.map(({ edge, otherNode, isOutgoing }, idx) => {
                if (!otherNode) return null;
                return (
                  <button
                    key={idx}
                    onClick={() => onSelectNode(otherNode)}
                    className="w-full text-left p-2.5 rounded-lg card-glass hover:border-zinc-500 transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="overflow-hidden">
                        <div className="text-xs font-medium text-zinc-200 group-hover:text-white truncate font-sans">
                          {otherNode.label}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                          <span className="text-indigo-400">
                            {isOutgoing ? `──(${edge.label})──>` : `<──(${edge.label})──`}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{otherNode.type}</span>
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {node.timestamp && (
          <div className="pt-2 border-t border-[var(--surface-border)] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Indexed: {new Date(node.timestamp).toLocaleDateString()}
            </span>
          </div>
        )}

      </div>
    </div>
  );
};

export default NodeDetailsDrawer;
