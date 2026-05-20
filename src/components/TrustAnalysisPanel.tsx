import { motion } from 'motion/react';
import { ShieldCheck, BarChart3, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Provider } from '../types';

interface TrustAnalysisPanelProps {
  provider: Provider | null;
}

export default function TrustAnalysisPanel({ provider }: TrustAnalysisPanelProps) {
  if (!provider) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-xl shadow-slate-200/40 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Trust Integrity Trace</h3>
        </div>
        <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-tighter">Verified Node</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MetricCard 
          icon={<BarChart3 className="w-3 h-3 text-accent" />}
          label="Reliability"
          value={provider.metrics.reliability}
        />
        <MetricCard 
          icon={<CheckCircle2 className="w-3 h-3 text-blue-500" />}
          label="Consistency"
          value={provider.metrics.consistency}
        />
        <MetricCard 
          icon={<AlertCircle className="w-3 h-3 text-red-400" />}
          label="Cancellations"
          value={provider.metrics.cancellationHistory}
        />
        <MetricCard 
          icon={<ShieldCheck className="w-3 h-3 text-emerald-500" />}
          label="Response"
          value={provider.metrics.responseRate}
        />
      </div>

      <div className="pt-4 border-t border-slate-100">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Trust Score</span>
          <span className="text-2xl font-black text-slate-900">{(provider.trustScore * 100).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${provider.trustScore * 100}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-accent"
          />
        </div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-lg font-black text-slate-900">{value}</div>
    </div>
  );
}
