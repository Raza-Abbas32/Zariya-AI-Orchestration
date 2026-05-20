import React, { useState, useEffect } from 'react';
import { Sliders, Save, RefreshCw, Terminal, HelpCircle } from 'lucide-react';

export default function ParametersPanel() {
  const [temperature, setTemperature] = useState(0.2);
  const [trustWeight, setTrustWeight] = useState(40);
  const [costWeight, setCostWeight] = useState(30);
  const [proximityWeight, setProximityWeight] = useState(30);
  const [searchRadius, setSearchRadius] = useState(15);
  const [simSpeed, setSimSpeed] = useState('1x');
  const [fallbackMode, setFallbackMode] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    'You are the Intent Agent of the Zariya multi-agent system. Extract service requirements, location landmarks, urgency level (NORMAL, HIGH, CRITICAL), and timestamp limitations from the normalized natural language query.'
  );
  
  const [isSaving, setIsSaving] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTemp = localStorage.getItem('zariya_param_temperature');
    const savedTrust = localStorage.getItem('zariya_param_trustWeight');
    const savedCost = localStorage.getItem('zariya_param_costWeight');
    const savedProx = localStorage.getItem('zariya_param_proximityWeight');
    const savedRad = localStorage.getItem('zariya_param_searchRadius');
    const savedSpeed = localStorage.getItem('zariya_param_simSpeed');
    const savedFallback = localStorage.getItem('zariya_param_fallbackMode');
    const savedPrompt = localStorage.getItem('zariya_param_systemPrompt');

    if (savedTemp) setTemperature(parseFloat(savedTemp));
    if (savedTrust) setTrustWeight(parseInt(savedTrust));
    if (savedCost) setCostWeight(parseInt(savedCost));
    if (savedProx) setProximityWeight(parseInt(savedProx));
    if (savedRad) setSearchRadius(parseInt(savedRad));
    if (savedSpeed) setSimSpeed(savedSpeed);
    if (savedFallback) setFallbackMode(savedFallback === 'true');
    if (savedPrompt) setSystemPrompt(savedPrompt);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem('zariya_param_temperature', temperature.toString());
    localStorage.setItem('zariya_param_trustWeight', trustWeight.toString());
    localStorage.setItem('zariya_param_costWeight', costWeight.toString());
    localStorage.setItem('zariya_param_proximityWeight', proximityWeight.toString());
    localStorage.setItem('zariya_param_searchRadius', searchRadius.toString());
    localStorage.setItem('zariya_param_simSpeed', simSpeed);
    localStorage.setItem('zariya_param_fallbackMode', fallbackMode.toString());
    localStorage.setItem('zariya_param_systemPrompt', systemPrompt);

    setTimeout(() => {
      setIsSaving(false);
      alert('Operational parameters synchronized and saved to LocalStorage registry.');
    }, 800);
  };

  const handleReset = () => {
    setTemperature(0.2);
    setTrustWeight(40);
    setCostWeight(30);
    setProximityWeight(30);
    setSearchRadius(15);
    setSimSpeed('1x');
    setFallbackMode(true);
    setSystemPrompt(
      'You are the Intent Agent of the Zariya multi-agent system. Extract service requirements, location landmarks, urgency level (NORMAL, HIGH, CRITICAL), and timestamp limitations from the normalized natural language query.'
    );
  };

  // Adjust sliders to make sure total weight sums to 100
  const handleWeightChange = (type: 'trust' | 'cost' | 'proximity', val: number) => {
    if (type === 'trust') {
      setTrustWeight(val);
      const remaining = 100 - val;
      setCostWeight(Math.round(remaining * (costWeight / (costWeight + proximityWeight || 1))));
      setProximityWeight(Math.round(remaining * (proximityWeight / (costWeight + proximityWeight || 1))));
    } else if (type === 'cost') {
      setCostWeight(val);
      const remaining = 100 - val;
      setTrustWeight(Math.round(remaining * (trustWeight / (trustWeight + proximityWeight || 1))));
      setProximityWeight(Math.round(remaining * (proximityWeight / (trustWeight + proximityWeight || 1))));
    } else {
      setProximityWeight(val);
      const remaining = 100 - val;
      setTrustWeight(Math.round(remaining * (trustWeight / (trustWeight + costWeight || 1))));
      setCostWeight(Math.round(remaining * (costWeight / (trustWeight + costWeight || 1))));
    }
  };

  return (
    <div className="p-6 pb-28 md:pb-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)] cyber-grid">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-5 h-5 text-accent" />
            OPERATIONAL HYPER-PARAMETERS
          </h2>
          <p className="text-xs text-slate-500">
            Configure Multi-Agent weights, LLM temperatures, and pipeline settings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleReset} 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button 
            onClick={handleSave} 
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 hover:scale-102 transition-all cursor-pointer shadow-md shadow-accent/25"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Syncing...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Core Agent Weights Card */}
        <div className="bg-white/80 border border-slate-200/80 p-6 rounded-3xl space-y-5 shadow-sm">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Matrix Scoring Weights
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
              Bayesian parameters for ranking recommended provider nodes (Sums to 100%)
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Trust Score Weight</span>
                <span className="text-emerald-600 font-bold">{trustWeight}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={trustWeight}
                onChange={(e) => handleWeightChange('trust', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Proximity Weight (Distance / ETA)</span>
                <span className="text-accent font-bold">{proximityWeight}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={proximityWeight}
                onChange={(e) => handleWeightChange('proximity', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Pricing Weight (Quoted Cost)</span>
                <span className="text-purple-600 font-bold">{costWeight}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={costWeight}
                onChange={(e) => handleWeightChange('cost', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          </div>
        </div>

        {/* LLM & Spatial configuration Card */}
        <div className="bg-white/80 border border-slate-200/80 p-6 rounded-3xl space-y-5 shadow-sm">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              LLM Temperature & Spatial Settings
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
              Adjust reasoning precision and search grid radiuses
            </p>
          </div>

          <div className="space-y-4">
            {/* Temp Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600 flex items-center gap-1">
                  LLM reasoning temperature
                  <span title="Higher temp leads to creative matching, lower to strict accuracy">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </span>
                </span>
                <span className="text-accent font-bold">{temperature}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="1.0" 
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            {/* Radius Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Max Spatial Search Radius</span>
                <span className="text-purple-600 font-bold">{searchRadius} km</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                step="1"
                value={searchRadius}
                onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Prompt Configurator */}
        <div className="bg-white/80 border border-slate-200/80 p-6 rounded-3xl space-y-4 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-600" />
                Selected Node Instructions Prompt
              </h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
                Customize operational parameters for the Intent Agent
              </p>
            </div>
          </div>

          <textarea 
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="flex-1 w-full min-h-[140px] bg-slate-50 border border-slate-200 rounded-2xl p-4 font-mono text-[11px] leading-relaxed text-purple-900 focus:outline-none focus:border-accent/40 focus:bg-white transition-all shadow-inner"
          />
        </div>

        {/* Global Pipeline Options */}
        <div className="bg-white/80 border border-slate-200/80 p-6 rounded-3xl space-y-6 shadow-sm">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
              Telemetry & Simulation Parameters
            </h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5 font-semibold">
              Configure system diagnostics parameters
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Pipeline speed</span>
                <span className="text-[10px] text-slate-500">Speed multiplier for orchestrator UI logs transition</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {['0.5x', '1x', '2x', 'Instant'].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setSimSpeed(speed)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      simSpeed === speed 
                        ? 'bg-accent text-white font-extrabold shadow-sm shadow-accent/25' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {speed}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-4">
              <div>
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Fallback Ledger DB</span>
                <span className="text-[10px] text-slate-500">Toggle MongoDB persistence fallback to local storage</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={fallbackMode}
                  onChange={(e) => setFallbackMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent peer-checked:after:bg-white" />
              </label>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
