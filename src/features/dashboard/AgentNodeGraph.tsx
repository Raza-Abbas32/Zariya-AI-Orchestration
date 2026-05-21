import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Compass, 
  ShieldCheck, 
  Coins, 
  CheckSquare, 
  PhoneCall, 
  Database,
  Info,
  Server,
  Terminal
} from 'lucide-react';

interface Node {
  id: string;
  label: string;
  role: string;
  icon: any;
  x: number;
  y: number;
  description: string;
  systemPrompt: string;
  model: string;
}

interface AgentNodeGraphProps {
  currentAgent: string | null;
  timeline: Record<string, string>;
}

export default function AgentNodeGraph({ currentAgent, timeline }: AgentNodeGraphProps) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const nodes: Node[] = [
    { 
      id: 'Communication', 
      label: 'Communication Agent', 
      role: 'Signal Normalizer', 
      icon: MessageSquare, 
      x: 100, 
      y: 250,
      description: 'Ingests multi-modal input (text, speech, voice wave). Identifies languages, normalizes Urdu/Roman Urdu slang, and prepares clean message frames.',
      systemPrompt: 'You are the Communication Agent. Detect language (Urdu/Sindhi/English). Transcribe, translate, and structure natural language inputs.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Intent', 
      label: 'Intent Agent', 
      role: 'Parameter Extractor', 
      icon: Search, 
      x: 280, 
      y: 120,
      description: 'Extracts exact service queries, location targets, time restrictions, urgency levels, and user details from normalized signals.',
      systemPrompt: 'Extract structured parameters. Required: service (AC Repair, Plumber, Tutor), location (Saddar, Gulshan, DHA), urgency (NORMAL, HIGH, CRITICAL).',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Planning', 
      label: 'Planning Agent', 
      role: 'Orchestrator Execution Plan', 
      icon: Compass, 
      x: 280, 
      y: 380,
      description: 'Generates a step-by-step DAG (directed acyclic graph) execution pipeline dynamically depending on intent parameters.',
      systemPrompt: 'Create execution DAG steps. Break down target task into dependencies. Outline necessary checks and routing sequences.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Discovery', 
      label: 'Discovery Agent', 
      role: 'Spatial Grid Scanner', 
      icon: Search, 
      x: 480, 
      y: 250,
      description: 'Scans the spatial grid coordinates around user/target location. Queries database and fetches live provider nodes within sector radius.',
      systemPrompt: 'Scan provider databases. Match requested specialty with provider locations and compute geographical distances.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Trust', 
      label: 'Trust Agent', 
      role: 'Bayesian Scoring Engine', 
      icon: ShieldCheck, 
      x: 650, 
      y: 120,
      description: 'Evaluates provider nodes against reliability metrics: completion rates, response latencies, cancellation logs, and user feedback.',
      systemPrompt: 'Calculate confidence scores. Evaluate metrics: reliability weight (0.4), consistency (0.3), rating (0.2), response rate (0.1).',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Negotiation', 
      label: 'Negotiation Agent', 
      role: 'Integrity Matcher', 
      icon: Coins, 
      x: 650, 
      y: 380,
      description: 'Balances proximity, trust score, and base cost to resolve optimal recommendations. Presents verified matching nodes.',
      systemPrompt: 'Weigh trust score vs cost vs ETA. Choose the absolute best candidate provider and structure final bid.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Booking', 
      label: 'Booking Agent', 
      role: 'Transaction Dispatcher', 
      icon: CheckSquare, 
      x: 820, 
      y: 180,
      description: 'Initializes and locks transaction records, updates provider state, dispatches multi-channel SMS/WhatsApp alerts, and locks in details.',
      systemPrompt: 'Establish secure transaction details. Generate bookingId, record timestamps, user contact, and lock provider status.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Follow-Up', 
      label: 'Follow-Up Agent', 
      role: 'Heartbeat Monitor', 
      icon: PhoneCall, 
      x: 820, 
      y: 320,
      description: 'Initiates a service delivery tracking loop. Polls ETA metrics and schedules customer satisfaction and resolution verification routines.',
      systemPrompt: 'Set heartbeat tracking. Monitor post-booking updates. Verify arrival and collect final user reviews.',
      model: 'Gemini 1.5 Flash'
    },
    { 
      id: 'Database', 
      label: 'Zariya Ledger DB', 
      role: 'MongoDB/Firestore Core', 
      icon: Database, 
      x: 480, 
      y: 450,
      description: 'Persistent system database storing global users, active provider availability coordinates, historical bookings, and logs.',
      systemPrompt: 'Read-only node storage references. Coordinates data updates across active transaction sessions.',
      model: 'JSON / Mongoose'
    }
  ];

  // Connections mapping nodes flow
  const connections = [
    { from: 'Communication', to: 'Intent' },
    { from: 'Communication', to: 'Planning' },
    { from: 'Intent', to: 'Discovery' },
    { from: 'Planning', to: 'Discovery' },
    { from: 'Discovery', to: 'Database' },
    { from: 'Discovery', to: 'Trust' },
    { from: 'Trust', to: 'Negotiation' },
    { from: 'Negotiation', to: 'Booking' },
    { from: 'Booking', to: 'Follow-Up' },
    { from: 'Follow-Up', to: 'Database' }
  ];

  const getNodeStatus = (nodeId: string) => {
    if (nodeId === 'Database') return 'database';
    
    // Map stage name to timeline keys
    const timelineKeyMap: Record<string, string> = {
      'Communication': 'Communication',
      'Intent': 'Intent',
      'Planning': 'Planning',
      'Discovery': 'Discovery',
      'Trust': 'Trust',
      'Negotiation': 'Negotiation',
      'Booking': 'Booking',
      'Follow-Up': 'Follow-Up'
    };

    const key = timelineKeyMap[nodeId];
    if (currentAgent === key) return 'processing';
    
    const status = timeline[key];
    if (status === 'completed') return 'completed';
    if (status === 'processing') return 'processing';
    return 'idle';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-[calc(100vh-80px)] overflow-y-auto cyber-grid">
      {/* Node Graph Visualizer */}
      <div className="lg:col-span-2 cyber-panel cyber-panel-glow border border-slate-200/60 p-6 relative flex flex-col justify-between overflow-hidden shadow-sm bg-white/80 backdrop-blur-md">
        
        {/* Decorative Grid overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(85,3,165,0.03),transparent_60%)] pointer-events-none" />
        <div className="scanline absolute inset-0 opacity-10 pointer-events-none" />
        
        <div className="z-10 flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-lg font-black tracking-wide text-slate-800 flex items-center gap-2">
              <Server className="w-5 h-5 text-accent" />
              AI NODE ARCHITECTURE
            </h2>
            <p className="text-xs text-slate-500 font-semibold font-mono">
              Real-time multi-agent communication networks and system states
            </p>
          </div>
          
          {/* Status Legend */}
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-55 px-4 py-2 rounded-xl border border-slate-200 font-mono">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
              <span>Synced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <span>Standby</span>
            </div>
          </div>
        </div>

        {/* SVG Network Visualizer */}
        <div className="flex-1 w-full relative flex items-center justify-center min-h-[400px]">
          <svg 
            viewBox="0 0 950 520" 
            className="w-full h-full max-h-[480px] drop-shadow-[0_4px_12px_rgba(148,163,184,0.08)] select-none"
          >
            {/* Draw Connection Links */}
            {connections.map((conn, idx) => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              const isFromActive = getNodeStatus(fromNode.id) === 'processing';
              const isToActive = getNodeStatus(toNode.id) === 'processing';
              const isCompleted = getNodeStatus(fromNode.id) === 'completed';

              let strokeColor = 'rgba(148, 163, 184, 0.15)';
              let strokeWidth = 2;
              let dashArray = 'none';

              if (isFromActive || isToActive) {
                strokeColor = 'rgba(85, 3, 165, 0.4)';
                strokeWidth = 3;
                dashArray = '5,5';
              } else if (isCompleted) {
                strokeColor = 'rgba(5, 150, 105, 0.3)';
                strokeWidth = 2;
              }

              return (
                <g key={`link-${idx}`}>
                  {/* Outer glow route */}
                  <line 
                    x1={fromNode.x} 
                    y1={fromNode.y} 
                    x2={toNode.x} 
                    y2={toNode.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={dashArray}
                    className={isFromActive || isToActive ? 'animate-[dash_10s_linear_infinite]' : ''}
                  />

                  {/* Animated Particle Packets flowing along active routes */}
                  {(isFromActive || isCompleted) && (
                    <motion.circle
                      r="4"
                      fill={isFromActive ? "#5503A5" : "#059669"}
                      initial={{ offset: 0 }}
                      animate={{ 
                        cx: [fromNode.x, toNode.x],
                        cy: [fromNode.y, toNode.y]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "linear",
                        delay: idx * 0.4
                      }}
                    />
                  )}
                </g>
              );
            })}

            {/* Draw Agent Nodes */}
            {nodes.map((node) => {
              const NodeIcon = node.icon;
              const status = getNodeStatus(node.id);
              const isSelected = selectedNode?.id === node.id;
              
              let borderColor = 'rgba(148, 163, 184, 0.3)';
              let bgColor = '#ffffff';
              let iconColor = 'text-slate-500';
              let ringPulse = false;

              if (status === 'processing') {
                borderColor = '#5503A5';
                bgColor = 'rgba(85, 3, 165, 0.08)';
                iconColor = 'text-accent';
                ringPulse = true;
              } else if (status === 'completed') {
                borderColor = '#059669';
                bgColor = 'rgba(5, 150, 105, 0.08)';
                iconColor = 'text-[#059669]';
              } else if (status === 'database') {
                borderColor = 'rgba(124, 58, 237, 0.4)';
                bgColor = 'rgba(124, 58, 237, 0.04)';
                iconColor = 'text-[#7c3aed]';
              }

              if (isSelected) {
                borderColor = status === 'processing' ? '#5503A5' : (status === 'completed' ? '#059669' : '#7c3aed');
              }

              return (
                <g 
                  key={node.id} 
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                >
                  {/* Outer selection ring */}
                  {isSelected && (
                    <circle 
                      cx={node.x} 
                      cy={node.y} 
                      r="40" 
                      fill="none" 
                      stroke={borderColor} 
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      className="animate-[spin_20s_linear_infinite]"
                    />
                  )}

                  {/* Pulsing ring if active */}
                  {ringPulse && (
                    <circle 
                      cx={node.x} 
                      cy={node.y} 
                      r="36" 
                      fill="none" 
                      stroke="#5503A5" 
                      strokeWidth="3"
                      className="animate-ping opacity-25"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle 
                    cx={node.x} 
                    cy={node.y} 
                    r="28" 
                    fill={bgColor} 
                    stroke={borderColor} 
                    strokeWidth={isSelected ? 3 : 2}
                    className="transition-all duration-300 group-hover:stroke-accent"
                  />

                  {/* Icon Placement */}
                  <g transform={`translate(${node.x - 12}, ${node.y - 12})`}>
                    <foreignObject width="24" height="24">
                      <div className={`w-6 h-6 flex items-center justify-center ${iconColor}`}>
                        <NodeIcon className="w-5 h-5" />
                      </div>
                    </foreignObject>
                  </g>

                  {/* Node Label Text */}
                  <text 
                    x={node.x} 
                    y={node.y + 44} 
                    textAnchor="middle" 
                    fill="#0f172a" 
                    className="text-[11px] font-black tracking-wide uppercase font-sans"
                  >
                    {node.label}
                  </text>

                  {/* Node Role Subtitle */}
                  <text 
                    x={node.x} 
                    y={node.y + 56} 
                    textAnchor="middle" 
                    fill="#64748b" 
                    className="text-[8px] font-bold uppercase tracking-widest opacity-80 font-mono"
                  >
                    {node.role}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Node Details Inspection Panel */}
      <div className="cyber-panel cyber-panel-glow border border-slate-200/60 rounded-3xl p-6 flex flex-col h-full shadow-sm bg-white/80 backdrop-blur-md">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
        
        {selectedNode ? (
          <div className="space-y-6 z-10 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-accent">
                  <selectedNode.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase tracking-wider">
                    {selectedNode.label}
                  </h3>
                  <span className="text-[10px] text-accent font-black tracking-widest uppercase font-mono">
                    {selectedNode.role}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                  Functional Objective
                </label>
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {selectedNode.description}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3 h-3 text-[#7c3aed]" />
                  System Instructions
                </label>
                <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-[11px] font-mono text-purple-300 overflow-y-auto max-h-[160px] leading-relaxed">
                  {selectedNode.systemPrompt}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    MODEL INFRASTRUCTURE
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {selectedNode.model}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1 font-mono">
                    NODE STATUS
                  </span>
                  <span className={`text-xs font-black uppercase tracking-widest font-mono ${
                    getNodeStatus(selectedNode.id) === 'processing' 
                      ? 'text-accent' 
                      : (getNodeStatus(selectedNode.id) === 'completed' ? 'text-emerald-600' : 'text-slate-450')
                  }`}>
                    {getNodeStatus(selectedNode.id) === 'database' ? 'ONLINE' : getNodeStatus(selectedNode.id)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 text-center">
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">
                <Info className="w-3 h-3" />
                Select any node to inspect system weights
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 bg-slate-50 rounded-full border border-slate-200 text-slate-400">
              <Info className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                No Node Selected
              </h3>
              <p className="text-xs text-slate-500 max-w-[200px] mt-1 mx-auto leading-relaxed font-semibold">
                Click any agent node inside the neural network grid to trace parameters.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
