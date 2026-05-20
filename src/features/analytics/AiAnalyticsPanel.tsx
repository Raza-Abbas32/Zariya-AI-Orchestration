import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { BarChart3, TrendingUp, Globe, Clock, ShieldAlert } from 'lucide-react';
import { BookingHistory } from '../../types';

interface AiAnalyticsPanelProps {
  history: BookingHistory[];
}

export default function AiAnalyticsPanel({ history }: AiAnalyticsPanelProps) {
  // 1. Process History for Daily Booking volume (mocked last 7 days + user bookings)
  const lineData = [
    { date: 'May 14', requests: 12, completed: 10 },
    { date: 'May 15', requests: 19, completed: 15 },
    { date: 'May 16', requests: 15, completed: 14 },
    { date: 'May 17', requests: 25, completed: 22 },
    { date: 'May 18', requests: 32, completed: 28 },
    { date: 'May 19', requests: 28, completed: 27 },
    { date: 'May 20', requests: 35 + history.length, completed: 31 + history.filter(h => h.status === 'Completed').length }
  ];

  // 2. Query Language distribution
  const pieData = [
    { name: 'Urdu', value: 42 },
    { name: 'English', value: 28 },
    { name: 'Roman Urdu', value: 20 },
    { name: 'Sindhi', value: 10 }
  ];

  const COLORS = ['#5503A5', '#7c3aed', '#059669', '#ec4899'];

  // 3. Agent Performance Metrics
  const radarData = [
    { subject: 'Communication speed', A: 95, B: 85, fullMark: 100 },
    { subject: 'Intent Extraction', A: 92, B: 90, fullMark: 100 },
    { subject: 'Path Optimization', A: 88, B: 95, fullMark: 100 },
    { subject: 'Trust scoring accuracy', A: 96, B: 80, fullMark: 100 },
    { subject: 'Negotiation rate', A: 84, B: 90, fullMark: 100 },
    { subject: 'Dispatch response', A: 90, B: 85, fullMark: 100 }
  ];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)] cyber-grid">
      
      {/* Upper Statistics row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard 
          icon={<TrendingUp className="w-4 h-4 text-accent" />}
          label="Total Dispatch Volume"
          value={160 + history.length}
          change="+18.4%"
        />
        <StatsCard 
          icon={<Clock className="w-4 h-4 text-purple-600" />}
          label="Avg Dispatch Latency"
          value="4.2s"
          change="-0.8s"
        />
        <StatsCard 
          icon={<Globe className="w-4 h-4 text-emerald-600" />}
          label="Urdu/Roman Translation Rate"
          value="62%"
          change="+4.2%"
        />
        <StatsCard 
          icon={<ShieldAlert className="w-4 h-4 text-rose-500" />}
          label="Orchestration Precision"
          value="98.5%"
          change="+0.3%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Booking Volume Line Chart */}
        <div className="lg:col-span-2 cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <BarChart3 className="w-5 h-5 text-accent" />
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Orchestration Traffic & Resolution
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Daily telemetry of queries vs finalized handshakes
              </p>
            </div>
          </div>
          
          <div className="h-[250px] w-full mt-2 font-mono text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderColor: 'rgba(148,163,184,0.2)',
                    borderRadius: '16px',
                    color: '#0f172a',
                    fontFamily: 'var(--font-mono)',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="requests" 
                  name="AI Ingestions" 
                  stroke="#5503A5" 
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  name="Dispatch handshakes" 
                  stroke="#059669" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Language distribution Pie Chart */}
        <div className="cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <Globe className="w-5 h-5 text-purple-600" />
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Ingested Signals Language
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Urdu transcription and translation parsing ratio
              </p>
            </div>
          </div>

          <div className="h-[220px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderColor: 'rgba(148,163,184,0.2)',
                    borderRadius: '12px',
                    color: '#0f172a',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Absolute Label */}
            <div className="absolute text-center">
              <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Parsed</span>
              <span className="text-lg font-mono font-black text-slate-800">4 Languages</span>
            </div>
          </div>

          {/* Custom legends list */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2 text-[10px] font-mono">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                <span className="text-slate-500 font-semibold">{entry.name}</span>
                <span className="text-slate-800 font-black ml-auto">{entry.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Lower Row: Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <Clock className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Multi-Agent Response Matrix
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Response vectors across primary system nodes
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full flex items-center justify-center font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.12)" />
                <PolarAngleAxis dataKey="subject" stroke="#64748b" />
                <PolarRadiusAxis stroke="rgba(148,163,184,0.2)" angle={30} domain={[0, 100]} />
                <Radar 
                  name="Standard Pipeline" 
                  dataKey="A" 
                  stroke="#5503A5" 
                  fill="#5503A5" 
                  fillOpacity={0.15} 
                />
                <Radar 
                  name="Optimized Route Mode" 
                  dataKey="B" 
                  stroke="#7c3aed" 
                  fill="#7c3aed" 
                  fillOpacity={0.1} 
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Informative Dashboard Guide */}
        <div className="cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between relative overflow-hidden border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#5503A5]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-4">
            <h4 className="text-xs font-black text-[#5503A5] uppercase tracking-widest">
              AI Command Diagnostics
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Zariya multi-agent system runs active telemetry monitoring. Signal normalizers structure raw inputs into normalized commands. Ingested datasets sync back to the cloud network automatically.
            </p>
            
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-mono text-slate-600 font-semibold">Intelligent intent router active</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-600 font-semibold">Bayesian reliability checking active</span>
              </div>
            </div>
          </div>

          <div className="text-[9px] font-mono text-slate-400 font-bold uppercase mt-4">
            System status: nominal. Build version 2.4.0
          </div>
        </div>

      </div>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change: string;
}

function StatsCard({ icon, label, value, change }: StatsCardProps) {
  const isPositive = change.startsWith('+');
  return (
    <div className="cyber-panel cyber-panel-glow p-5 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all duration-300 border border-slate-200/60 bg-white/80 backdrop-blur-md">
      <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-[#5503A5]/2 rounded-full pointer-events-none group-hover:scale-110 transition-transform" />
      <div className="flex items-center justify-between mb-3">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150">
          {icon}
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {change}
        </span>
      </div>
      <div>
        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
          {label}
        </span>
        <span className="text-xl font-mono font-black text-slate-800">
          {value}
        </span>
      </div>
    </div>
  );
}
