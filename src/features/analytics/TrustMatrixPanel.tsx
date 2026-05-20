import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  CartesianGrid, 
  Tooltip, 
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Shield, Sparkles, Check, ArrowRightLeft } from 'lucide-react';
import { Provider } from '../../types';

interface TrustMatrixPanelProps {
  providers: Provider[];
}

export default function TrustMatrixPanel({ providers }: TrustMatrixPanelProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Default fallback providers list if none are active in current session state
  const demoProviders: Provider[] = [
    {
      id: 'prov_1',
      name: 'Muhammad Ali (Plumbing Core)',
      specialty: 'Plumbing',
      location: { lat: 24.8607, lng: 67.0011, address: 'Saddar, Karachi' },
      distance: '2.1 km',
      availability: 'Immediate',
      eta: '12 mins',
      rating: 4.8,
      trustScore: 0.94,
      avatar: '',
      pricing: { serviceFee: 300, partsEst: 800, total: 1100 },
      metrics: { reliability: '98%', consistency: '94%', cancellationHistory: '2%', responseRate: '99%' }
    },
    {
      id: 'prov_2',
      name: 'Ahmad & Sons Technicians',
      specialty: 'Plumbing',
      location: { lat: 24.9263, lng: 67.0877, address: 'Gulshan-e-Iqbal, Karachi' },
      distance: '3.4 km',
      availability: 'Immediate',
      eta: '18 mins',
      rating: 4.6,
      trustScore: 0.89,
      avatar: '',
      pricing: { serviceFee: 250, partsEst: 600, total: 850 },
      metrics: { reliability: '92%', consistency: '89%', cancellationHistory: '5%', responseRate: '95%' }
    },
    {
      id: 'prov_3',
      name: 'Yasir Shah Electrical & Pipe',
      specialty: 'Plumbing',
      location: { lat: 24.8080, lng: 67.0315, address: 'DHA Phase 6, Karachi' },
      distance: '1.2 km',
      availability: 'Immediate',
      eta: '9 mins',
      rating: 4.2,
      trustScore: 0.76,
      avatar: '',
      pricing: { serviceFee: 500, partsEst: 1000, total: 1500 },
      metrics: { reliability: '82%', consistency: '75%', cancellationHistory: '12%', responseRate: '88%' }
    },
    {
      id: 'prov_4',
      name: 'Hassan Quick Fixes',
      specialty: 'Plumbing',
      location: { lat: 24.8267, lng: 67.0270, address: 'Clifton, Karachi' },
      distance: '5.8 km',
      availability: 'Standby',
      eta: '25 mins',
      rating: 4.9,
      trustScore: 0.96,
      avatar: '',
      pricing: { serviceFee: 200, partsEst: 500, total: 700 },
      metrics: { reliability: '99%', consistency: '97%', cancellationHistory: '1%', responseRate: '99%' }
    }
  ];

  const activeProviders = providers.length > 0 ? providers : demoProviders;

  // Process data for Scatter Chart (Price vs Trust Score)
  const scatterData = activeProviders.map(p => ({
    name: p.name,
    trust: parseFloat((p.trustScore * 100).toFixed(1)),
    price: p.pricing.total,
    eta: p.eta,
    id: p.id
  }));

  // Process data for Bar Chart (Response rate vs reliability percentage)
  const barData = activeProviders.map(p => ({
    name: p.name.split(' ')[0], // short name
    reliability: parseFloat(p.metrics.reliability.replace('%', '')),
    response: parseFloat(p.metrics.responseRate.replace('%', '')),
  }));

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        // limit comparison to 3 providers
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const getCustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl font-mono text-[10px] space-y-1 text-slate-800 shadow-xl">
          <div className="font-bold text-accent">{data.name}</div>
          <div>Trust index: <span className="text-emerald-600 font-bold">{data.trust}%</span></div>
          <div>Total fee: <span className="text-[#5503A5] font-bold">PKR {data.price}</span></div>
          <div>ETA: <span className="text-slate-600 font-bold">{data.eta}</span></div>
        </div>
      );
    }
    return null;
  };

  const comparedProviders = activeProviders.filter(p => selectedIds.includes(p.id));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)] cyber-grid">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            TRUST INTEGRITY MATRIX
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Multi-node reliability checking and pricing optimization analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Scatter Plot */}
        <div className="cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Pareto Frontier Optimization
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Cost vs Trust distribution curve (Aim: Bottom-Right)
              </p>
            </div>
            <div className="p-1 bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg" title="Cost vs Trust Optimization">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
          </div>

          <div className="h-[250px] w-full mt-2 font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis 
                  type="number" 
                  dataKey="trust" 
                  name="Trust Score" 
                  unit="%" 
                  domain={[50, 100]} 
                  stroke="#64748b" 
                />
                <YAxis 
                  type="number" 
                  dataKey="price" 
                  name="Total Cost" 
                  unit=" PKR" 
                  stroke="#64748b" 
                />
                <ZAxis type="number" range={[100, 200]} />
                <Tooltip content={getCustomScatterTooltip} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Providers" data={scatterData} fill="#5503A5" line={false} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar comparison Chart */}
        <div className="cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm flex flex-col justify-between border border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-3.5">
            <div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                Response Latency & Reliability
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Comparative node reliability vs response rate percentages
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full mt-2 font-mono text-[9px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderColor: 'rgba(148,163,184,0.2)',
                    borderRadius: '16px',
                    color: '#0f172a',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)'
                  }}
                />
                <Legend />
                <Bar dataKey="reliability" name="Reliability Index" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="response" name="Response Speed" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Provider comparative list selection */}
      <div className="cyber-panel cyber-panel-glow p-6 rounded-3xl shadow-sm space-y-4 border border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div>
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-accent" />
            Interactive Node Comparison Drawer
          </h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold font-mono">
            Select up to 3 verified provider nodes to compare operational indices
          </p>
        </div>

        {/* Checkbox grid selection */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {activeProviders.map(p => {
            const isChecked = selectedIds.includes(p.id);
            return (
              <div 
                key={p.id}
                onClick={() => handleToggleSelect(p.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all duration-300 ${
                  isChecked 
                    ? 'bg-accent/10 border-accent glow-border-cyan' 
                    : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100/50'
                }`}
              >
                <div>
                  <span className="block text-xs font-black text-slate-800 truncate max-w-[150px]">{p.name}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">{p.specialty}</span>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isChecked ? 'bg-accent border-accent text-white' : 'border-slate-300 bg-transparent'
                }`}>
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Side-by-side comparison table */}
        {comparedProviders.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-2.5 px-3 font-black text-slate-400 uppercase tracking-wider">Metrics Matrix</th>
                  {comparedProviders.map(p => (
                    <th key={p.id} className="py-2.5 px-3 font-black text-slate-800 uppercase tracking-wider text-center">{p.name.split(' ')[0]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-3 font-bold text-slate-500">Trust Score Indicator</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center text-emerald-600 font-black text-xs">
                      {(p.trustScore * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-3 font-bold text-slate-500">Response Rate Speed</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center font-black text-slate-800">{p.metrics.responseRate}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-3 font-bold text-slate-500">Reliability Index</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center font-bold text-slate-800">{p.metrics.reliability}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-3 font-bold text-slate-500">Cancellation Logs</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center font-bold text-rose-600">{p.metrics.cancellationHistory}</td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-3 px-3 font-bold text-slate-500">ETA / Distance</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center font-bold text-slate-700">{p.eta} ({p.distance})</td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-3 font-bold text-slate-500">Total Quoted Fee</td>
                  {comparedProviders.map(p => (
                    <td key={p.id} className="py-3 px-3 text-center font-black text-[#5503A5] text-xs">PKR {p.pricing.total}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
