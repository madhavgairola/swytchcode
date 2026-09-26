import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import ForceGraph from 'force-graph';
import { 
  GraphNode, 
  GraphEdge, 
  KnowledgeGraphData,
  SourceType 
} from '../types/graph.js';
import { 
  Compass, 
  Mail, 
  Folder, 
  BookOpen, 
  MessageSquare, 
  Database, 
  Sparkles, 
  CloudSun, 
  Send, 
  ShieldCheck,
  Link2,
  ExternalLink
} from 'lucide-react';
import { SOURCE_COLORS } from '../services/graphStore.js';

interface KnowledgeGraphProps {
  data: KnowledgeGraphData;
  selectedNodeId: string | null;
  onSelectNode: (node: GraphNode | null) => void;
  onInvestigateNode?: (node: GraphNode) => void;
  activeContextName?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface HoverTooltipData {
  node: GraphNode;
  x: number;
  y: number;
}

const SOURCE_LABELS: Record<string, string> = {
  core: 'RECALL Intelligence',
  gmail: 'Gmail & Workspace',
  google_drive: 'Google Drive',
  notion: 'Notion Workspace',
  slack: 'Slack Enterprise',
  box: 'Box Storage',
  weatherapi: 'WeatherAPI Tool',
  resend: 'Resend Tool',
  derived: 'AI Derived & Decision',
  decision: 'Engineering Decision',
  tools: 'Swytchcode Tool',
};

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  data,
  selectedNodeId,
  onSelectNode,
  onInvestigateNode,
  activeContextName = 'All Sources',
  theme = 'dark',
}) => {
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const graphInstanceRef = useRef<any>(null);
  
  // Hover & Active Neighborhood State
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Calculate neighbor map for fast lookup
  const { neighborMap, connectedEdgesMap } = useMemo(() => {
    const neighbors: Record<string, Set<string>> = {};
    const edgeCount: Record<string, number> = {};

    data.nodes.forEach(n => {
      neighbors[n.id] = new Set();
      edgeCount[n.id] = 0;
    });

    data.edges.forEach(e => {
      const s = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const t = typeof e.target === 'object' ? (e.target as any).id : e.target;
      if (neighbors[s]) neighbors[s].add(t);
      if (neighbors[t]) neighbors[t].add(s);
      edgeCount[s] = (edgeCount[s] || 0) + 1;
      edgeCount[t] = (edgeCount[t] || 0) + 1;
    });

    return { neighborMap: neighbors, connectedEdgesMap: edgeCount };
  }, [data]);

  // Format node & link colors based on actual knowledge provenance
  const formattedGraphData = useMemo(() => {
    const nodes = data.nodes.map(n => {
      const nodeColor = n.color || SOURCE_COLORS[n.source] || SOURCE_COLORS[n.type] || '#38bdf8';
      return {
        ...n,
        color: nodeColor,
      };
    });

    const links = data.edges.map(e => ({
      source: e.source,
      target: e.target,
      label: e.label,
      relationshipType: e.relationshipType,
      val: e.strength || 1
    }));

    return { nodes, links };
  }, [data]);

  // Keep ref to hoveredNode for canvas draw loop
  const hoveredNodeRef = useRef<GraphNode | null>(null);
  hoveredNodeRef.current = hoveredNode;

  const selectedNodeIdRef = useRef<string | null>(null);
  selectedNodeIdRef.current = selectedNodeId;

  // Track mouse coordinates for floating tooltip card
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (hoveredNodeRef.current && graphContainerRef.current) {
      const rect = graphContainerRef.current.getBoundingClientRect();
      setTooltipPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  // Initialize and tune ForceGraph instance
  useEffect(() => {
    if (!graphContainerRef.current) return;

    graphContainerRef.current.innerHTML = '';
    const container = graphContainerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    // 1. Initialize ForceGraph Instance per exact specification
    const graph = (ForceGraph as any)()(container)
      .width(width)
      .height(height)
      .graphData(formattedGraphData)
      .nodeId('id')
      .nodeVal('val')
      .nodeLabel(() => '') // Custom canvas labels and hover card
      .linkDirectionalParticles(2)
      .linkDirectionalParticleSpeed((d: any) => ((d.val || 1) * 0.001))
      .linkDirectionalParticleWidth(1.6)
      .linkColor((link: any) => {
        const hNode = hoveredNodeRef.current;
        const sNodeId = selectedNodeIdRef.current;
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        
        const isConnectedToHover = hNode && (srcId === hNode.id || tgtId === hNode.id);
        const isConnectedToSelect = sNodeId && (srcId === sNodeId || tgtId === sNodeId);

        const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';

        if (isConnectedToHover || isConnectedToSelect) {
          return isLightMode ? 'rgba(14, 165, 233, 0.85)' : 'rgba(56, 189, 248, 0.85)';
        }

        if (hNode || sNodeId) {
          // Dim other edges when interacting
          return isLightMode ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)';
        }

        return isLightMode ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)';
      })
      .linkWidth((link: any) => {
        const hNode = hoveredNodeRef.current;
        const sNodeId = selectedNodeIdRef.current;
        const srcId = typeof link.source === 'object' ? link.source.id : link.source;
        const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if ((hNode && (srcId === hNode.id || tgtId === hNode.id)) || (sNodeId && (srcId === sNodeId || tgtId === sNodeId))) {
          return 2.2;
        }
        return 1.0;
      })
      .backgroundColor('transparent')
      .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const isRoot = node.id === 'hub-core' || node.group === 0;
        const isHub = (node.group ?? 0) > 0 && node.val === 10;
        
        const hNode = hoveredNodeRef.current;
        const sId = selectedNodeIdRef.current;

        const isHovered = hNode && hNode.id === node.id;
        const isSelected = sId === node.id;
        const isNeighbor = hNode && neighborMap[hNode.id]?.has(node.id);
        const isSelectNeighbor = sId ? neighborMap[sId]?.has(node.id) : false;

        const hasActiveFocus = Boolean(hNode || sId);
        const isHighlighted = isHovered || isSelected || isNeighbor || isSelectNeighbor;

        // Node circle sizing
        const baseSize = isRoot ? 14 : isHub ? 9.5 : 6.5;
        const size = isHovered ? baseSize * 1.3 : isSelected ? baseSize * 1.25 : isNeighbor ? baseSize * 1.12 : baseSize;
        const nodeColor = node.color || SOURCE_COLORS[node.source] || SOURCE_COLORS[node.type] || '#38bdf8';

        // Apply alpha dimming for non-highlighted nodes during focus
        ctx.save();
        if (hasActiveFocus && !isHighlighted && !isRoot) {
          ctx.globalAlpha = 0.28;
        } else {
          ctx.globalAlpha = 1.0;
        }

        // Draw glowing outer ring on hover or selection
        if (isHovered || isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
          ctx.strokeStyle = nodeColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Draw glowing node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
        ctx.fillStyle = nodeColor;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = isHovered ? 20 : isSelected ? 18 : isRoot ? 16 : isHub ? 12 : 8;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset blur for sharp text

        // Text label drawing rule:
        // Core and Category Hubs always show their clean category names.
        // Satellite leaf nodes show labels ONLY when hovered, selected, or directly connected neighbor!
        const shouldShowLabel = isRoot || isHub || isHovered || isSelected || isNeighbor;

        if (shouldShowLabel) {
          const fontSize = (isRoot ? 16 : isHub ? 12.5 : isHovered ? 12 : 10.5) / Math.max(globalScale, 0.35);
          ctx.font = `${isRoot || isHovered || isSelected ? '600 ' : '400 '}${fontSize}px 'Space Mono', monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
          
          if (isRoot) {
            ctx.fillStyle = isLightMode ? '#0284c7' : '#38bdf8';
          } else if (isHovered || isSelected) {
            ctx.fillStyle = isLightMode ? '#111827' : '#ffffff';
          } else if (isHub) {
            ctx.fillStyle = isLightMode ? '#374151' : '#e4e4e7';
          } else if (isNeighbor) {
            ctx.fillStyle = isLightMode ? '#4b5563' : '#a1a1aa';
          }

          ctx.fillText(node.label || node.id, node.x, node.y + size + 4);
        }

        ctx.restore();
      })
      .onNodeClick((node: any) => {
        const original = data.nodes.find(n => n.id === node.id) || node;
        onSelectNode(original);
      })
      .onNodeHover((node: any) => {
        if (container) {
          container.style.cursor = node ? 'pointer' : 'grab';
        }
        
        if (node) {
          const original = data.nodes.find(n => n.id === node.id) || node;
          setHoveredNode(original);
        } else {
          setHoveredNode(null);
          setTooltipPos(null);
        }
      });

    // 2. Exact Physics Tuning with Loose & Spacious Branching
    const linkForce = graph.d3Force('link');
    if (linkForce) {
      linkForce.distance((link: any) => {
        const src = link.source?.id || link.source;
        const tgt = link.target?.id || link.target;
        // Central root to category hubs: wide distance for expansive constellation
        if (src === 'hub-core' || tgt === 'hub-core') return 195;
        // Hubs to child skills and cross-links: comfortable open separation
        return 80;
      });
    }

    const chargeForce = graph.d3Force('charge');
    if (chargeForce) {
      // Repulsion force prevents clumping and keeps constellation loose
      chargeForce.strength(-380);
    }

    graphInstanceRef.current = graph;

    // Smooth camera reset
    const timer = setTimeout(() => {
      graph.zoomToFit(400, 100);
    }, 200);

    // Dynamic Theme Change Observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          graph.linkColor(() => document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.09)' : 'rgba(255,255,255,0.09)');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });

    // Auto resize listener
    const handleResize = () => {
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        graph.width(container.clientWidth);
        graph.height(container.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      if (graphInstanceRef.current && typeof graphInstanceRef.current._destructor === 'function') {
        graphInstanceRef.current._destructor();
      }
    };
  }, [formattedGraphData, data.nodes, neighborMap, onSelectNode]);

  // Smooth Camera Reset
  const handleResetView = () => {
    if (graphInstanceRef.current) {
      graphInstanceRef.current.zoomToFit(400, 100);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'gmail': return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'google_drive': return <Folder className="w-3.5 h-3.5 text-amber-400" />;
      case 'notion': return <BookOpen className="w-3.5 h-3.5 text-purple-400" />;
      case 'slack': return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
      case 'box': return <Database className="w-3.5 h-3.5 text-orange-400" />;
      case 'weatherapi': return <CloudSun className="w-3.5 h-3.5 text-cyan-400" />;
      case 'resend': return <Send className="w-3.5 h-3.5 text-pink-400" />;
      default: return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div 
      id="skills-graph-wrapper" 
      className="relative w-full h-full select-none overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      
      {/* Interactive Canvas */}
      <div 
        id="skills-graph-container"
        ref={graphContainerRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing"
      />

      {/* Floating Hover Card (Only visible when hovering over a node) */}
      {hoveredNode && tooltipPos && (
        <div 
          className="pointer-events-none absolute z-30 transform -translate-x-1/2 -translate-y-full mb-3 px-4 py-3 card-glass rounded-2xl shadow-2xl border border-[var(--surface-border)] backdrop-blur-xl max-w-xs transition-all duration-150 animate-in fade-in zoom-in-95"
          style={{ 
            left: `${Math.min(Math.max(tooltipPos.x, 150), (graphContainerRef.current?.clientWidth || 800) - 150)}px`, 
            top: `${Math.max(tooltipPos.y - 12, 10)}px` 
          }}
        >
          {/* Top Row: Source Provenance Pill & Type */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
              <span 
                className="w-2 h-2 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: hoveredNode.color || SOURCE_COLORS[hoveredNode.source] || '#38bdf8' }}
              />
              <span>{SOURCE_LABELS[hoveredNode.source] || hoveredNode.source}</span>
            </div>
            {hoveredNode.relevanceScore !== undefined && (
              <span className="text-[10px] font-mono text-emerald-400">
                {hoveredNode.relevanceScore}%
              </span>
            )}
          </div>

          {/* Node Title */}
          <h4 className="text-xs font-bold text-white font-heading leading-tight mb-1">
            {hoveredNode.label}
          </h4>

          {/* Summary Excerpt */}
          <p className="text-[11px] text-zinc-300 leading-snug line-clamp-2 font-sans mb-2">
            {hoveredNode.summary}
          </p>

          {/* Footer: Connected Relations Count */}
          <div className="pt-1.5 border-t border-[var(--surface-border)] flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Link2 className="w-3 h-3 text-indigo-400" />
              <span>{connectedEdgesMap[hoveredNode.id] || 0} connected relations</span>
            </span>
            <span className="text-[9px] text-zinc-500 capitalize">Click for details</span>
          </div>
        </div>
      )}

      {/* Bottom-Right Minimal Reset View Button */}
      <div className="absolute bottom-4 right-5 z-20">
        <button
          id="graph-reset-btn"
          onClick={handleResetView}
          className="flex items-center gap-2 px-3.5 py-1.5 card-glass hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-mono rounded-xl shadow-2xl transition-all cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-zinc-400" />
          <span>Reset View</span>
        </button>
      </div>

    </div>
  );
};

export default KnowledgeGraph;
