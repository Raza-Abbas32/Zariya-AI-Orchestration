import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Wifi, Send, Trash2 } from 'lucide-react';
import { AgentLog } from '../../types';

interface AntigravityStreamProps {
  logs: AgentLog[];
  isProcessing: boolean;
  timeline?: Record<string, string>;
}

export default function AntigravityStream({ logs, isProcessing, timeline = {} }: AntigravityStreamProps) {
  const [terminalInput, setTerminalInput] = useState('');
  const [customLogs, setCustomLogs] = useState<any[]>([]);
  const streamEndRef = useRef<HTMLDivElement>(null);
  
  // Combine official agent logs with terminal-specific custom input logs
  useEffect(() => {
    // When logs reset or change, update the feed
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
      source: log.agent,
      message: log.message,
      reasoning: log.reasoning,
      type: log.type
    }));
    
    // Add welcome diagnostic log if logs are empty
    if (formattedLogs.length === 0 && customLogs.length === 0) {
      setCustomLogs([
        {
          id: 'welcome',
          timestamp: new Date(),
          source: 'System',
          message: 'Antigravity telemetry system initialized. Secure websocket connection online.',
          type: 'info'
        }
      ]);
    } else if (formattedLogs.length > 0) {
      // Clear custom logs if actual agent execution begins to show clean agent output
      setCustomLogs([]);
    }
  }, [logs]);

  const allLogs = [...customLogs, ...logs.map(log => ({
    id: log.id,
    timestamp: log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp),
    source: log.agent,
    message: log.message,
    reasoning: log.reasoning,
    type: log.type
  }))];

  useEffect(() => {
    // Auto-scroll to bottom on new logs
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allLogs]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const cmd = terminalInput.trim();
    setTerminalInput('');

    // Append user command log
    const userLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      source: 'USER_SECURE_TTY',
      message: `$ ${cmd}`,
      type: 'info' as const
    };

    setCustomLogs(prev => [...prev, userLog]);

    setTimeout(() => {
      let responseMsg = '';
      let responseType: 'info' | 'success' | 'warning' | 'error' = 'info';

      const parts = cmd.toLowerCase().split(' ');
      const mainCmd = parts[0];

      switch (mainCmd) {
        case '/help':
          responseMsg = 'Available commands: /clear (Clear terminal), /status (Get node states), /reboot (Restart telemetry handshake), /sysinfo (System hardware check)';
          break;
        case '/clear':
          setCustomLogs([]);
          return;
        case '/status':
          const activeAgent = Object.keys(timeline).find(k => timeline[k] === 'processing') || 'NONE';
          responseMsg = `[Node Diagnostic] Active orchestrator process: ${activeAgent}. System load: normal. Connection: synced.`;
          responseType = 'success';
          break;
        case '/reboot':
          responseMsg = '[System Handshake] Restarting websocket bridges... Synced. Port: 3001. Protocol: secure WSS.';
          responseType = 'warning';
          break;
        case '/sysinfo':
          responseMsg = `[Telemetry Report] CPU: 42% | Heap: 78.4MB / 128MB | API: Active | DB: Connected (local_fallback)`;
          responseType = 'success';
          break;
        default:
          responseMsg = `Command "${cmd}" not recognized. Type /help for system guidelines.`;
          responseType = 'error';
      }

      setCustomLogs(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        source: 'System',
        message: responseMsg,
        type: responseType
      }]);
    }, 400);
  };

  const getLogColors = (type: string) => {
    switch (type) {
      case 'success':
        return { text: 'text-emerald-400', source: 'text-emerald-400 font-bold' };
      case 'warning':
        return { text: 'text-amber-400', source: 'text-amber-400 font-bold' };
      case 'error':
        return { text: 'text-rose-400', source: 'text-rose-450 font-bold' };
      default:
        return { text: 'text-accent', source: 'text-violet-400 font-bold' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col h-full font-mono text-xs text-slate-350">
      
      {/* Header telemetry status */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#5503A5]/25 rounded-lg text-violet-400 border border-slate-700/30">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100 text-[11px] uppercase tracking-wider">
              ANTIGRAVITY TELEMETRY STREAM
            </div>
            <div className="text-[8px] text-[#8b5cf6] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#5503A5] animate-pulse" />
              <span>Secure socket bridge active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[9px] text-slate-400 font-bold uppercase font-mono">
          <div className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-[#8b5cf6]" />
            <span>PORT 3001</span>
          </div>
          <button 
            onClick={() => setCustomLogs([])} 
            className="p-1 hover:text-rose-400 text-slate-400 rounded transition-colors cursor-pointer"
            title="Clear Stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal logs list */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-2 min-h-[180px] max-h-[300px]">
        {allLogs.map((log) => {
          const colors = getLogColors(log.type);
          const timeStr = log.timestamp.toTimeString().split(' ')[0];
          
          return (
            <div key={log.id} className="space-y-1 group">
              <div className="flex items-start gap-2">
                <span className="text-slate-500 select-none text-[10px] font-mono">{timeStr}</span>
                <span className={`font-mono select-none uppercase tracking-widest text-[10px] ${colors.source}`}>
                  [{log.source}]
                </span>
                <span className={`flex-1 text-slate-350 leading-relaxed font-medium font-mono ${log.source === 'USER_SECURE_TTY' ? 'text-white font-bold' : ''}`}>
                  {log.message}
                </span>
              </div>
              
              {/* Detailed Reasoning block */}
              {log.reasoning && (
                <div className="ml-14 pl-3.5 border-l border-[#5503A5]/40 text-[10px] text-violet-300/80 leading-relaxed max-w-[90%] whitespace-pre-wrap font-mono">
                  {log.reasoning}
                </div>
              )}
            </div>
          );
        })}
        <div ref={streamEndRef} />
      </div>

      {/* Input diagnostic line */}
      <form onSubmit={handleCommandSubmit} className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3.5">
        <span className="text-[#8b5cf6] font-bold select-none font-mono">$</span>
        <input 
          type="text" 
          value={terminalInput}
          onChange={(e) => setTerminalInput(e.target.value)}
          placeholder="Type diagnostic commands (e.g. /status, /sysinfo)..."
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none caret-[#8b5cf6] font-mono text-xs"
        />
        <button 
          type="submit" 
          className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5 text-[#8b5cf6]" />
        </button>
      </form>
    </div>
  );
}
