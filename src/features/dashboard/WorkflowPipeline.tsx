import React from 'react';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Compass, 
  Database, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  Loader2
} from 'lucide-react';
import { AgentLog } from '../../types';

interface Stage {
  id: string;
  name: string;
  timelineKey: string;
  icon: any;
  description: string;
}

interface WorkflowPipelineProps {
  currentAgent: string | null;
  timeline: Record<string, string>;
  isProcessing: boolean;
  logs: AgentLog[];
}

export default function WorkflowPipeline({ currentAgent, timeline, isProcessing, logs }: WorkflowPipelineProps) {
  const stages: Stage[] = [
    { id: 'comms', name: 'Communication', timelineKey: 'Communication', icon: MessageSquare, description: 'Signal Ingestion' },
    { id: 'intent', name: 'Intent Analysis', timelineKey: 'Intent', icon: Search, description: 'Parameter Extraction' },
    { id: 'planning', name: 'Agent Planning', timelineKey: 'Planning', icon: Compass, description: 'DAG Generation' },
    { id: 'discovery', name: 'Matrix Matching', timelineKey: 'Discovery', icon: Database, description: 'Geospatial Discovery' },
    { id: 'trust', name: 'Trust Validation', timelineKey: 'Trust', icon: ShieldAlert, description: 'Bayesian Scoring' },
    { id: 'assignment', name: 'Assignment', timelineKey: 'Negotiation', icon: Sparkles, description: 'Optimization Resolution' },
    { id: 'completion', name: 'Completion', timelineKey: 'Booking', icon: CheckCircle2, description: 'Dispatched & Synced' },
  ];

  const getStageStatus = (stage: Stage) => {
    if (!isProcessing && Object.keys(timeline).length === 0) return 'idle';
    
    // Check if the current agent is active on this stage
    if (currentAgent === stage.timelineKey) return 'active';
    
    const status = timeline[stage.timelineKey];
    if (status === 'processing') return 'active';
    if (status === 'completed') return 'completed';
    
    // Fallback: If later stages are completed, preceding stages must be completed
    const stageIndex = stages.findIndex(s => s.id === stage.id);
    const activeIndex = stages.findIndex(s => s.timelineKey === currentAgent);
    
    if (activeIndex > stageIndex) return 'completed';
    
    return 'idle';
  };

  // Find the current reasoning to display under the pipeline
  const getActiveReasoning = () => {
    if (!isProcessing) return null;
    
    const activeLog = [...logs].reverse().find(l => l.agent === currentAgent);
    if (activeLog && activeLog.reasoning) {
      return {
        agent: activeLog.agent,
        text: activeLog.reasoning
      };
    }
    return null;
  };

  const activeReasoning = getActiveReasoning();

  return (
    <div className="cyber-panel cyber-panel-glow border border-slate-200/60 bg-white/80 backdrop-blur-md p-6 rounded-3xl relative overflow-hidden shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-accent/5 pointer-events-none" />
      
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Autonomous Execution Flow
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 font-semibold font-mono">
            Multi-agent logical sequence monitoring pipeline
          </p>
        </div>
        
        {isProcessing && (
          <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-xl text-xs font-bold text-accent">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>AI Reasoning In Progress</span>
          </div>
        )}
      </div>

      {/* Horizon Flow Stages */}
      <div className="relative flex items-center justify-between px-4 pb-4 overflow-x-auto min-w-[700px]">
        {/* Background track line */}
        <div className="absolute top-[28px] left-[5%] right-[5%] h-0.5 bg-slate-200/60 -z-10" />
        
        {stages.map((stage, index) => {
          const status = getStageStatus(stage);
          const StageIcon = stage.icon;
          
          let circleColor = 'bg-slate-50 border-slate-200 text-slate-400';
          let textColor = 'text-slate-400 font-semibold';
          let subtitleColor = 'text-slate-500';

          if (status === 'active') {
            circleColor = 'bg-accent/10 border-accent text-accent animate-pulse-glow';
            textColor = 'text-accent font-black';
            subtitleColor = 'text-slate-700';
          } else if (status === 'completed') {
            circleColor = 'bg-emerald-50 border-emerald-500 text-emerald-600';
            textColor = 'text-emerald-600 font-black';
            subtitleColor = 'text-slate-500';
          }

          return (
            <div key={stage.id} className="flex flex-col items-center text-center w-[12%] relative group">
              {/* Connector line overlay filled based on status */}
              {index < stages.length - 1 && (
                <div 
                  className={`absolute top-[28px] left-[60%] w-[130%] h-0.5 -z-10 transition-all duration-500 ${
                    status === 'completed' ? 'bg-emerald-500/40' : (status === 'active' ? 'bg-accent/40 animate-pulse' : 'bg-transparent')
                  }`}
                />
              )}

              {/* Node Circle */}
              <div 
                className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-300 relative ${circleColor}`}
              >
                <StageIcon className="w-5 h-5" />
                
                {/* Active radar indicator */}
                {status === 'active' && (
                  <div className="absolute inset-0 rounded-2xl bg-accent/20 animate-ping opacity-75" />
                )}
              </div>

              {/* Text Info */}
              <span className={`text-[11px] uppercase tracking-wider mt-3 transition-colors duration-300 ${textColor}`}>
                {stage.name}
              </span>
              <span className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 opacity-80 ${subtitleColor}`}>
                {stage.description}
              </span>
            </div>
          );
        })}
      </div>

      {/* Real-time reasoning stream block */}
      {isProcessing && activeReasoning && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-slate-50 border border-slate-100 p-4 rounded-2xl font-mono text-[11px] leading-relaxed relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <div className="flex items-center gap-2 text-accent/80 font-black uppercase tracking-wider mb-2 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>Trace reasoning: {activeReasoning.agent} Agent</span>
          </div>
          <div className="text-slate-600 whitespace-pre-wrap max-h-[80px] overflow-y-auto font-mono">
            {activeReasoning.text}
          </div>
        </motion.div>
      )}
    </div>
  );
}
