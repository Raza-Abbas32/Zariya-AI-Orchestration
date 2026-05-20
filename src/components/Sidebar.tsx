import React from 'react';
import { 
  LayoutDashboard, 
  Network, 
  Receipt, 
  Sliders, 
  Shield, 
  Terminal, 
  BarChart3, 
  HeartPulse, 
  LogOut,
  User as UserIcon,
  History,
  Coins,
  Users,
  Activity
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: { name: string; email: string; role: string } | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  // Determine dynamic role-specific items
  const getRoleItems = () => {
    switch (user?.role) {
      case 'provider':
        return [
          { id: 'provider-orders', label: 'Dispatch Orders', icon: Activity },
          { id: 'provider-earnings', label: 'Earnings Node', icon: Coins }
        ];
      case 'admin':
        return [
          { id: 'admin-bookings', label: 'Orchestration Board', icon: LayoutDashboard },
          { id: 'admin-users', label: 'Node Provisioning', icon: Users }
        ];
      case 'customer':
      default:
        return [
          { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
          { id: 'history', label: 'Activity History', icon: History }
        ];
    }
  };

  const roleItems = getRoleItems();

  const developerItems = [
    { id: 'agent-nodes', label: 'Agent Nodes', icon: Network },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'parameters', label: 'Parameters', icon: Sliders },
    { id: 'trust-matrix', label: 'Trust Matrix', icon: Shield },
    { id: 'live-streams', label: 'Live Streams', icon: Terminal },
    { id: 'ai-analytics', label: 'AI Analytics', icon: BarChart3 },
    { id: 'system-health', label: 'System Health', icon: HeartPulse }
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen sticky top-0 text-slate-900 z-20 shadow-sm">
      {/* Brand Logo */}
      <div className="p-5 flex items-center gap-3 border-b border-slate-100 bg-white">
        <img src="/assets/zariya_logo.png" className="h-10 object-contain" alt="Zariya Logo" />
        <div>
          <h1 className="text-xl font-black tracking-tight text-[#5503A5] font-sans">
            ZARIYA
          </h1>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
            Autonomous AI
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 font-mono">
          {user?.role === 'provider' ? 'Provider Node' : (user?.role === 'admin' ? 'Admin Core' : 'Mission Control')}
        </div>
        {roleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-300 relative group cursor-pointer ${
                isActive 
                  ? 'bg-accent/10 border-l-[3px] border-accent text-accent glow-border-cyan' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-accent' : 'text-slate-400 group-hover:text-slate-700'
              }`} />
              <span>{item.label}</span>
              
              {!isActive && (
                <div className="absolute right-3 w-1 h-1 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}

        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-3 mt-6 mb-2 font-mono">
          Telemetry & Network
        </div>
        {developerItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300 relative group cursor-pointer ${
                isActive 
                  ? 'bg-accent/10 border-l-[3px] border-accent text-accent glow-border-cyan' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 border-l-[3px] border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? 'text-accent' : 'text-slate-400 group-hover:text-slate-700'
              }`} />
              <span>{item.label}</span>
              
              {!isActive && (
                <div className="absolute right-3 w-1 h-1 rounded-full bg-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        {user ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-800 truncate">{user.name}</div>
                <div className="text-[9px] text-slate-500 truncate tracking-tight">{user.email}</div>
                <div className="inline-block mt-0.5 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
                  {user.role}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200/60 hover:border-red-200 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect Link</span>
            </button>
          </div>
        ) : (
          <div className="text-center py-2 text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse font-mono">
            Secure Handshake Pending
          </div>
        )}
      </div>
    </aside>
  );
}
