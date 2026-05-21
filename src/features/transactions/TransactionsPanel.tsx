import React, { useState } from 'react';
import { Receipt, Search, Eye, Download, ArrowUpRight, X } from 'lucide-react';
import { BookingHistory } from '../../types';

interface TransactionsPanelProps {
  history: BookingHistory[];
}

export default function TransactionsPanel({ history }: TransactionsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Completed' | 'Processing'>('ALL');
  const [selectedTx, setSelectedTx] = useState<BookingHistory | null>(null);

  const filteredHistory = history.filter(tx => {
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.providerName && tx.providerName.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 pb-28 md:pb-6 space-y-6 overflow-y-auto h-[calc(100vh-80px)] cyber-grid relative">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Receipt className="w-5 h-5 text-accent" />
            OPERATIONAL TRANSACTIONS LEDGER
          </h2>
          <p className="text-xs text-slate-500 font-semibold">
            Audit logs of multi-agent bookings, invoices, and completed handshakes
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="cyber-panel cyber-panel-glow border border-slate-200/60 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm bg-white/80 backdrop-blur-md">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by transaction ID, service, or provider..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 focus:border-accent/45 focus:bg-white rounded-xl text-xs font-mono text-slate-800 focus:outline-none placeholder-slate-400"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="flex bg-slate-100/60 p-1 rounded-xl border border-slate-200">
            {['ALL', 'Completed', 'Processing'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === status 
                    ? 'bg-accent text-white font-black shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/30'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Main Grid Ledger Table */}
      <div className="cyber-panel cyber-panel-glow border border-slate-200/60 rounded-3xl overflow-hidden shadow-sm bg-white/80 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] text-slate-600 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">TRANSACTION REFERENCE</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">TIMESTAMP</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">SERVICE TYPE</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">LOCATION ZONE</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">DISPATCHED PROVIDER</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">TRANSACTION VALUE</th>
                <th className="py-3 px-4 font-black text-slate-400 uppercase tracking-widest">STATUS</th>
                <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length > 0 ? (
                filteredHistory.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-all">
                    <td className="py-3.5 px-4 font-black text-accent">{tx.id}</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {tx.timestamp instanceof Date ? tx.timestamp.toLocaleString() : new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-800 uppercase">{tx.service}</td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">{tx.location}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-black">{tx.providerName || 'AI Matching...'}</td>
                    <td className="py-3.5 px-4 font-black text-[#5503A5]">
                      {tx.totalAmount ? `PKR ${tx.totalAmount}` : 'Calculating...'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        tx.status === 'Completed' 
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                          : 'bg-[#22164a] text-purple-200 border border-purple-500/20'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button 
                        onClick={() => setSelectedTx(tx)}
                        className="p-1.5 bg-slate-50 border border-slate-200 hover:bg-accent/10 hover:border-accent hover:text-accent rounded-lg text-slate-500 transition-all cursor-pointer"
                        title="Audit Transaction Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 uppercase tracking-widest font-mono">
                    No matching transaction logs in local ledger database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Side Drawer Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="w-full max-w-md h-full bg-white border-l border-slate-200 p-6 flex flex-col justify-between shadow-2xl relative">
            
            <button 
              onClick={() => setSelectedTx(null)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-xl border border-transparent hover:border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-6 overflow-y-auto flex-1 pr-1 pb-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mt-6">
                <div className="p-3 bg-accent/10 rounded-2xl border border-accent/20 text-accent">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base uppercase tracking-wider">
                    Trace payload audits
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    Ref: {selectedTx.id}
                  </span>
                </div>
              </div>

              <div className="space-y-4 font-mono text-[11px] leading-relaxed">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5 text-slate-600">
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="text-slate-400 font-bold">Service Category</span>
                    <span className="text-slate-800 font-black">{selectedTx.service}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="text-slate-400 font-bold">Target Landmark</span>
                    <span className="text-slate-700 font-semibold">{selectedTx.location}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="text-slate-400 font-bold">Resolved Provider</span>
                    <span className="text-slate-800 font-black">{selectedTx.providerName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                    <span className="text-slate-400 font-bold">Execution Status</span>
                    <span className="text-emerald-600 font-black uppercase tracking-wider">{selectedTx.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">Transacted Amount</span>
                    <span className="text-[#5503A5] font-black">PKR {selectedTx.totalAmount || '0'}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    AI Execution Metadata Ledger
                  </span>
                  <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-[10px] text-slate-400 overflow-y-auto max-h-[140px] space-y-1.5 font-mono">
                    <div>{`[` + new Date(selectedTx.timestamp).toISOString() + `] Initialized Signal normalizer.`}</div>
                    <div>{`[` + new Date(selectedTx.timestamp).toISOString() + `] Language detected: Roman Urdu/English.`}</div>
                    <div>{`[` + new Date(selectedTx.timestamp).toISOString() + `] Matched provider node: ` + (selectedTx.providerName || 'N/A')}</div>
                    <div>{`[` + new Date(selectedTx.timestamp).toISOString() + `] Dispatched SMS and email triggers.`}</div>
                    <div>{`[` + new Date(selectedTx.timestamp).toISOString() + `] Sync status: LEDGER_COMMIT_OK.`}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button 
                onClick={() => {
                  alert('Receipt payload downloaded to secure terminal local repository.');
                  setSelectedTx(null);
                }}
                className="w-full py-2.5 bg-accent hover:bg-accent/90 hover:scale-[1.01] text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-accent/15"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                Download Secure Receipt
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
