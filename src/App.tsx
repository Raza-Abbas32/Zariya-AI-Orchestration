import { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Map as MapIcon, 
  Terminal, 
  Activity, 
  User, 
  Mic, 
  Search, 
  CheckCircle2, 
  Timer,
  Globe,
  Settings,
  History,
  LayoutDashboard,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import MapView from './components/MapView';
import { ZariyaOrchestrator } from './services/orchestrator';
import { OrchestrationState } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_STATE: OrchestrationState = {
  isProcessing: false,
  input: '',
  intent: null,
  providers: [],
  selectedProvider: null,
  bookingId: null,
  logs: [],
  currentAgent: null,
  timeline: {},
  userLocation: null,
  history: [],
  isAwaitingSelection: false,
  bookingStage: 'idle',
  userContact: ''
};

const AGENT_SEQUENCE = [
  'Communication',
  'Intent',
  'Discovery',
  'Trust',
  'Negotiation',
  'Booking',
  'Follow-Up'
];

export default function App() {
  const [state, setState] = useState<OrchestrationState>(INITIAL_STATE);
  const orchestrator = useRef<ZariyaOrchestrator | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history'>('dashboard');
  const [contactInput, setContactInput] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setState(s => ({ ...s, userLocation: { lat: latitude, lng: longitude } }));
          console.log("User location acquired:", latitude, longitude);
        },
        (error) => {
          console.error("Error fetching location:", error);
        }
      );
    }
  }, []);

  useEffect(() => {
    orchestrator.current = new ZariyaOrchestrator(state, setState);
  }, [state.userLocation, state.history, state.intent, state.selectedProvider]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.logs]);

  const handleStart = () => {
    if (input.trim()) {
      orchestrator.current?.run(input);
    }
  };

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    if (!isVoiceMode) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US'; 
      recognition.start();
      setIsVoiceMode(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsVoiceMode(false);
        orchestrator.current?.run(transcript);
      };

      recognition.onerror = () => setIsVoiceMode(false);
      recognition.onend = () => setIsVoiceMode(false);
    }
  };

  const handleConfirmBooking = () => {
    if (state.selectedProvider) {
      orchestrator.current?.proceedToForm(state.selectedProvider);
    }
  };

  const handleFinalDispatch = () => {
    if (state.selectedProvider && contactInput.trim()) {
      orchestrator.current?.confirmSelection(state.selectedProvider, contactInput);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Mobile Header (Visible only on small screens) */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter">Zariya</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            PK-01
          </div>
        </div>
      </header>

      {/* Responsive Sidebar (Hidden on mobile) */}
      <nav className="hidden md:flex w-64 border-r border-slate-200 bg-white flex-col p-6 z-20">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">Zariya <span className="text-accent">/</span></span>
        </div>

        <div className="space-y-1 flex-1">
          <SidebarItem 
            icon={<LayoutDashboard className="w-5 h-5 text-slate-400 group-hover:text-accent transition-colors" />} 
            label="Command Center" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')}
          />
          <SidebarItem 
            icon={<History className="w-5 h-5 text-slate-400 group-hover:text-accent transition-colors" />} 
            label="Activity Log" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')}
          />
          <SidebarItem icon={<Cpu className="w-5 h-5 text-slate-400" />} label="Agent Nodes" />
          <SidebarItem icon={<Settings className="w-5 h-5 text-slate-400" />} label="Parameters" />
        </div>

        <div className="mt-auto flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">System Online</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col p-4 md:p-8 gap-4 md:gap-6 overflow-y-auto pb-24 md:pb-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Mission Control</h1>
                <p className="text-slate-500 text-sm font-medium">Autonomous Service Orchestration Node</p>
              </div>
              
              <div className="flex w-full md:w-auto bg-white border border-slate-200 p-1 rounded-2xl shadow-sm">
                <button 
                  onClick={() => setIsVoiceMode(false)}
                  className={cn("flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all", !isVoiceMode ? "bg-accent text-white shadow-md shadow-accent/20" : "text-slate-400 hover:text-slate-900")}
                >
                  Logical Input
                </button>
                <button 
                  onClick={toggleVoice}
                  className={cn("flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] md:text-xs font-bold transition-all flex items-center justify-center gap-2", isVoiceMode ? "bg-accent text-white shadow-md shadow-accent/20" : "text-slate-400 hover:text-slate-900")}
                >
                  <Mic className="w-3 h-3" />
                  Neural Voice
                </button>
              </div>
            </header>

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 flex-1 min-h-0">
              {/* Main Content: Input + Discovery */}
              <div className="lg:col-span-8 flex flex-col gap-6 order-1 lg:order-1">
                {/* Input Card */}
                <section className="bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] p-4 md:p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                  <div className="flex flex-col gap-4">
                    <div className="relative">
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Search services... (e.g. 'I need a plumber')"
                        className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl p-4 md:p-6 text-base md:text-lg font-medium focus:outline-none focus:ring-4 focus:ring-accent/10 transition-all min-h-[100px] md:min-h-[120px] resize-none"
                      />
                      <AnimatePresence>
                        {isVoiceMode && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-accent/95 backdrop-blur-md rounded-xl md:rounded-2xl flex items-center justify-center gap-4 md:gap-6 text-white text-center"
                          >
                            <div className="flex gap-1 items-end h-6 md:h-8">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <motion.div 
                                  key={i}
                                  animate={{ height: [8, 24, 12, 18, 8] }}
                                  transition={{ repeat: Infinity, duration: 1, delay: i * 0.1 }}
                                  className="w-1.5 md:w-2 bg-white rounded-full"
                                />
                              ))}
                            </div>
                            <span className="font-black text-xs md:text-sm uppercase tracking-widest md:tracking-[0.2em]">Neural Signal Capture...</span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                       <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-3 py-1 rounded-full">
                        <Globe className="w-3 h-3" />
                        Region: <span className="text-slate-900">Pakistan-01</span>
                       </div>
                       <button 
                        onClick={handleStart}
                        disabled={state.isProcessing || !input.trim()}
                        className="w-full sm:w-auto bg-accent text-white px-8 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-black tracking-tight hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-accent/30"
                      >
                        {state.isProcessing ? 'COMMUNICATING...' : 'INITIALIZE PIPELINE'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Map Section */}
                <section className="h-[300px] md:flex-1 bg-white border border-slate-200 rounded-[24px] md:rounded-[32px] overflow-hidden shadow-xl shadow-slate-200/40 relative flex flex-col">
                  <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <MapIcon className="w-3 h-3 md:w-4 md:h-4 text-accent" />
                    <span className="text-[10px] md:text-xs font-black tracking-widest uppercase">Spatial Trace</span>
                  </div>
                  <div className="flex-1 min-h-0">
                    <MapView 
                      providers={state.providers} 
                      targetLocation={state.userLocation || (state.intent ? { lat: 31.4805, lng: 74.3213 } : null)}
                      selectedProvider={state.selectedProvider}
                    />
                  </div>

                  {/* Desktop Provider Selection List */}
                  {state.isAwaitingSelection && (
                    <motion.div 
                      initial={{ y: 100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className="bg-white border-t border-slate-100 p-6 max-h-[350px] overflow-y-auto"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Autonomous Recommendations</h2>
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-slate-400 font-bold">TRUST-VERIFIED NODES</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {state.providers.map((p) => (
                          <button 
                            key={p.id}
                            onClick={() => setState(s => ({ ...s, selectedProvider: p }))}
                            className={cn(
                              "p-5 rounded-3xl border-2 transition-all flex items-center justify-between text-left group gap-4 relative overflow-hidden",
                              state.selectedProvider?.id === p.id 
                                ? "bg-accent/[0.03] border-accent shadow-lg shadow-accent/5" 
                                : "bg-slate-50 border-transparent hover:bg-white hover:border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-4 relative z-10">
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors",
                                state.selectedProvider?.id === p.id ? "bg-accent text-white" : "bg-white text-slate-400 group-hover:text-accent"
                              )}>
                                {p.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 leading-tight">{p.name}</h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-black text-accent uppercase tracking-tighter bg-accent/5 px-2 py-0.5 rounded-lg">{p.specialty}</span>
                                  <span className="text-[10px] text-slate-400 font-bold">{p.rating} ★</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right relative z-10">
                              <div className="text-sm font-black text-slate-900">PKR {p.pricing.total}</div>
                              <div className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mt-1">{p.eta}</div>
                            </div>
                            {state.selectedProvider?.id === p.id && (
                              <motion.div 
                                layoutId="selection-glow"
                                className="absolute inset-0 bg-accent/5 animate-pulse"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Desktop Selection Overlay */}
                  <AnimatePresence>
                    {state.selectedProvider && state.bookingStage === 'selection' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 bg-white/95 backdrop-blur-xl border border-slate-200 p-4 md:p-6 rounded-[20px] md:rounded-[24px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 z-[1000]"
                      >
                        <div className="flex items-center gap-4 md:gap-5 w-full md:w-auto">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-accent rounded-xl md:rounded-2xl flex items-center justify-center text-white text-xl md:text-2xl font-black shadow-lg shadow-accent/20">
                            {state.selectedProvider.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight">{state.selectedProvider.name}</h3>
                            <div className="flex items-center gap-2 md:gap-3 mt-1">
                              <span className="text-[10px] md:text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 md:py-1 rounded-lg uppercase tracking-tight">{state.selectedProvider.specialty}</span>
                              <span className="text-[10px] md:text-xs font-black text-emerald-500 uppercase tracking-widest">{state.selectedProvider.eta} OUT</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto">
                          <div className="text-left md:text-right">
                             <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Est. Fee</div>
                             <div className="text-xl md:text-2xl font-black text-slate-900">PKR {state.selectedProvider.pricing.total}</div>
                          </div>
                          <button 
                            onClick={handleConfirmBooking}
                            className="bg-accent text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-accent/25 hover:scale-105 active:scale-95 transition-all"
                          >
                            PROCEED
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              {/* Secondary Content: Sequence + Logs (Hidden or moved on mobile) */}
              <div className="lg:col-span-4 flex flex-col gap-6 order-2 lg:order-2">
                {/* Desktop Sequence Panel (Hidden on small mobile, show in grid on md/lg) */}
                <div className="hidden md:flex bg-slate-900 rounded-[24px] md:rounded-[32px] p-6 shadow-2xl flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-accent" />
                      <span className="text-xs font-black tracking-widest uppercase text-slate-500">Agent Sequence</span>
                    </div>
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    {AGENT_SEQUENCE.map((agent, i) => {
                      const status = state.timeline[agent] || 'idle';
                      return (
                        <div key={agent} className="flex items-center gap-4">
                           <div className="relative flex flex-col items-center">
                            <div className={cn(
                              "w-2.5 h-2.5 rounded-full border-2 transition-all duration-500 z-10",
                              status === 'processing' && "bg-accent border-accent shadow-[0_0_15px_var(--color-accent-glow)] scale-125 animate-pulse",
                              status === 'completed' && "bg-emerald-500 border-emerald-500",
                              status === 'idle' && "border-slate-800 bg-transparent"
                            )} />
                            {i < AGENT_SEQUENCE.length - 1 && <div className="absolute top-2.5 w-[1px] h-6 bg-slate-800" />}
                          </div>
                          <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.2em] transition-colors flex-1",
                            status === 'processing' && "text-accent",
                            status === 'completed' && "text-white opacity-100",
                            status === 'idle' && "text-slate-500 opacity-50"
                          )}>{agent}</span>
                          {status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Log Stream - Integrated smoothly */}
                <div className="flex-1 bg-slate-900 rounded-[24px] md:rounded-[32px] p-6 shadow-2xl overflow-hidden flex flex-col min-h-[300px]">
                   <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-black tracking-widest uppercase text-slate-500">Live Telemetry</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 font-mono text-[10px] pr-2">
                       {state.logs.map((log) => (
                        <div key={log.id} className="flex gap-3">
                          <span className="text-slate-600 opacity-50">[{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                          <span className={cn(
                            "flex-1",
                            log.type === 'success' ? "text-accent font-bold" : 
                            log.type === 'error' ? "text-red-400" : "text-slate-400"
                          )}>
                            <span className="text-slate-500 font-bold mr-2 uppercase">[{log.agent.substring(0,3)}]</span>
                            {log.message}
                          </span>
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          <div className="flex-1 p-4 md:p-12 bg-white flex flex-col gap-6 md:gap-8 overflow-y-auto pb-24 md:pb-8">
             <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950">Activity Protocol</h1>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-1 md:mt-2">Historical Service Trace Index</p>
              </div>
              <div className="bg-slate-50 border border-slate-100 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl w-full md:w-auto">
                 <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ops</div>
                 <div className="text-xl md:text-2xl font-black text-slate-900">{state.history.length.toString().padStart(2, '0')}</div>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
              {state.history.length === 0 ? (
                <div className="py-20 md:py-32 flex flex-col items-center justify-center text-slate-300 gap-4">
                  <History className="w-12 h-12 md:w-16 md:h-16 opacity-20" />
                  <p className="font-bold uppercase tracking-widest text-[10px] md:text-xs">Node trace empty</p>
                </div>
              ) : (
                state.history.map((item) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={item.id} 
                    className={cn(
                      "group bg-white border p-4 md:p-6 rounded-2xl md:rounded-[24px] hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-4",
                      item.status === 'Processing' ? "border-accent/40 bg-accent/[0.02]" : "border-slate-100 hover:border-accent/30"
                    )}
                  >
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className={cn(
                        "w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center transition-all",
                        item.status === 'Processing' ? "bg-accent/10 text-accent animate-pulse" : "bg-emerald-50 text-emerald-500 group-hover:bg-accent group-hover:text-white"
                      )}>
                        {item.status === 'Processing' ? <Activity className="w-5 h-5 md:w-6 md:h-6" /> : <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 md:gap-3">
                          <h4 className="text-base md:text-lg font-black text-slate-900">{item.service}</h4>
                          <span className={cn(
                            "text-[8px] md:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight",
                            item.status === 'Processing' ? "bg-accent text-white" : "bg-slate-100 text-slate-500"
                          )}>{item.status}</span>
                        </div>
                        <p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                          {item.providerName || 'Assignment Pending'} • {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-end gap-6 md:gap-12 pl-16 md:pl-0">
                      <div className="text-left md:text-right">
                        <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target</div>
                        <div className="text-[10px] md:text-xs font-bold text-slate-900 truncate max-w-[120px]">{item.location}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fee</div>
                        <div className="text-lg md:text-xl font-black text-slate-950">
                          {item.totalAmount ? `PKR ${item.totalAmount}` : '---'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {/* Mobile Navbar (Visible only on small screens) */}
        <nav className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-[2000] flex items-center justify-around px-2">
          <MobileNavItem 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            icon={<LayoutDashboard className="w-5 h-5" />} 
            label="Command" 
          />
          <MobileNavItem 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History className="w-5 h-5" />} 
            label="Activity" 
          />
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
            <User className="w-5 h-5" />
          </div>
        </nav>

        {/* Floating Forms - Centered Overlays */}
        <AnimatePresence>
          {state.bookingStage === 'form' && (
             <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-[2000] flex items-center justify-center p-6"
             >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
                >
                  <div className="p-6 md:p-10 space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl md:text-3xl font-black tracking-tight">Verification</h2>
                      <button 
                        onClick={() => setState(s => ({ ...s, bookingStage: 'selection', isAwaitingSelection: true, selectedProvider: null }))}
                        className="text-slate-400 hover:text-accent font-bold text-[10px] uppercase tracking-widest transition-colors"
                      >
                        BACK
                      </button>
                    </div>

                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl space-y-4">
                       <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-xl flex items-center justify-center text-white text-base md:text-lg font-black">
                            {state.selectedProvider?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Expert</p>
                            <h4 className="text-base md:text-lg font-bold leading-tight">{state.selectedProvider?.name}</h4>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                          <div>
                             <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Fee</p>
                             <p className="text-base md:text-lg font-black">PKR {state.selectedProvider?.pricing.total}</p>
                          </div>
                          <div>
                             <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">ETA</p>
                             <p className="text-base md:text-lg font-black text-emerald-500">{state.selectedProvider?.eta}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em] pl-2">Contact Number</label>
                      <div className="relative">
                        <Globe className="absolute left-5 md:left-6 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                        <input 
                          type="tel"
                          value={contactInput}
                          onChange={(e) => setContactInput(e.target.value)}
                          placeholder="03XX-XXXXXXX"
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl md:rounded-3xl py-4 md:py-6 pl-12 md:pl-16 pr-6 text-lg md:text-xl font-bold focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={handleFinalDispatch}
                      disabled={!contactInput.trim() || state.isProcessing}
                      className="w-full bg-accent text-white py-4 md:py-6 rounded-xl md:rounded-[24px] font-black text-base md:text-lg shadow-2xl shadow-accent/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                      {state.isProcessing ? 'CONFIRMING...' : 'CONFIRM PROTOCOL'}
                    </button>
                  </div>
                </motion.div>
             </motion.div>
          )}
          
          {state.bookingStage === 'success' && (
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-accent backdrop-blur-2xl z-[3000] flex items-center justify-center p-6 text-white"
             >
                <div className="max-w-md w-full text-center space-y-8 md:space-y-12">
                   <motion.div 
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-[32px] md:rounded-[40px] shadow-2xl flex items-center justify-center mx-auto relative overflow-hidden"
                   >
                     <CheckCircle2 className="w-12 h-12 md:w-16 md:h-16 text-accent" />
                     <motion.div 
                        animate={{ y: [40, -80] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="absolute inset-0 bg-accent/10"
                      />
                   </motion.div>

                   <div className="space-y-4 px-4">
                      <h2 className="text-3xl md:text-5xl font-black tracking-tighter">Confirmed</h2>
                      <p className="text-white/70 font-medium text-base md:text-lg leading-relaxed">Agent has been dispatched and is currently navigating the spatial grid to reach your location.</p>
                   </div>

                   <div className="bg-white/10 backdrop-blur-md rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-white/20 space-y-4 md:space-y-6 mx-4">
                      <div className="flex items-center gap-4 md:gap-6 text-left">
                        <div className="p-3 md:p-4 bg-white/10 rounded-xl md:rounded-2xl">
                          <Timer className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div>
                          <p className="text-[8px] md:text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">ETA Sequence</p>
                          <p className="text-2xl md:text-3xl font-black">{state.selectedProvider?.eta}</p>
                        </div>
                      </div>
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center gap-3 text-xs md:text-sm font-bold text-white/80">
                         <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                         Target: {state.intent?.location}
                      </div>
                   </div>

                   <button 
                    onClick={() => setState(s => ({ ...s, bookingStage: 'idle', selectedProvider: null, providers: [], intent: null, bookingId: null, isProcessing: false }))}
                    className="w-[90%] md:w-full bg-white text-accent py-4 md:py-6 rounded-xl md:rounded-[24px] font-black text-base md:text-lg shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mx-auto"
                  >
                    BACK TO DASHBOARD
                  </button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function MobileNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-accent" : "text-slate-400"
      )}
    >
      <div className={cn("p-1.5 rounded-lg transition-all", active && "bg-accent/10")}>
        {icon}
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group w-full text-left",
        active ? "bg-accent/10 text-accent shadow-sm" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
      )}
    >
      <div className={cn("transition-colors", active ? "text-accent" : "text-slate-400 group-hover:text-accent")}>
        {icon}
      </div>
      <span className={cn("text-sm font-black tracking-tight", active ? "text-slate-900" : "text-slate-500")}>{label}</span>
      {active && <div className="ml-auto w-1 h-4 bg-accent rounded-full shadow-[0_0_8px_var(--color-accent-glow)]" />}
    </button>
  );
}

