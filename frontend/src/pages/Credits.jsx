import { useState, useEffect } from 'react';
import api from '../lib/api';
import { CreditCard, TrendingDown, TrendingUp, Filter, RefreshCw, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { SkeletonCard } from '../components/ui';

function fmt(val) {
  return parseFloat(val ?? 0).toFixed(4);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function Credits() {
  const [balance, setBalance] = useState(null);
  const [txs, setTxs]         = useState([]);
  const [loading, setLoading]  = useState(true);
  const [filter, setFilter]    = useState({ start: '', end: '', deployment_id: '' });
  const [page, setPage]        = useState(0);
  const PAGE_SIZE = 20;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const params = { skip: page * PAGE_SIZE, limit: PAGE_SIZE };
      if (filter.start)         params.start_date = filter.start;
      if (filter.end)           params.end_date   = filter.end;
      if (filter.deployment_id) params.deployment_id = filter.deployment_id;

      const [balRes, txRes] = await Promise.all([
        api.get('/credits/balance'),
        api.get('/credits/history', { params }),
      ]);
      setBalance(balRes.data.balance);
      setTxs(txRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [page, filter.start, filter.end, filter.deployment_id]);

  const totalSpent  = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalTopups = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Credits & Billing</h1>
        <p className="text-slate-400">Track your balance and full transaction history.</p>
      </header>

      {/* Balance + summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.0 }}
          className="glass-panel rounded-2xl p-6 md:col-span-1 flex items-center gap-4 border border-edge-blue/20">
          <div className="p-3 bg-edge-blue/20 rounded-xl">
            <CreditCard className="w-7 h-7 text-edge-glow" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-white">{loading ? '…' : fmt(balance)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Credits</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-panel rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <TrendingDown className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Spent (this page)</p>
            <p className="text-2xl font-bold text-red-400">{fmt(totalSpent)}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-panel rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <TrendingUp className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Top-ups (this page)</p>
            <p className="text-2xl font-bold text-green-400">{fmt(totalTopups)}</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-slate-400 mt-auto mb-2" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">From</label>
          <input type="date" value={filter.start}
            onChange={e => { setFilter(f => ({ ...f, start: e.target.value })); setPage(0); }}
            className="glass-input text-sm px-3 py-2 w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">To</label>
          <input type="date" value={filter.end}
            onChange={e => { setFilter(f => ({ ...f, end: e.target.value })); setPage(0); }}
            className="glass-input text-sm px-3 py-2 w-40" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Deployment ID</label>
          <input type="text" placeholder="filter by deployment…" value={filter.deployment_id}
            onChange={e => { setFilter(f => ({ ...f, deployment_id: e.target.value })); setPage(0); }}
            className="glass-input text-sm px-3 py-2 w-56" />
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-1.5 ml-auto btn-secondary px-4 py-2 text-sm">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Transaction table */}
      {loading ? (
        <SkeletonCard lines={6} />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left">
                {['Date', 'Type', 'Amount', 'Balance After', 'Duration', 'Deployment', 'Description'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">No transactions found.</td>
                </tr>
              ) : txs.map((tx, i) => {
                const isDebit  = tx.amount < 0;
                const amtClass = isDebit ? 'text-red-400' : 'text-green-400';
                return (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                  >
                    <td className="px-5 py-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        {fmtDate(tx.created_at)}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full border font-semibold capitalize
                        ${tx.transaction_type === 'topup'   ? 'bg-green-500/15 border-green-500/30 text-green-400' :
                          tx.transaction_type === 'refund'  ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' :
                          tx.transaction_type === 'penalty' ? 'bg-orange-500/15 border-orange-500/30 text-orange-400' :
                          'bg-white/5 border-white/10 text-slate-400'}`}>
                        {tx.transaction_type || 'runtime'}
                      </span>
                    </td>
                    <td className={`px-5 py-3 font-mono font-bold ${amtClass}`}>
                      {isDebit ? '−' : '+'}{fmt(Math.abs(tx.amount))}
                    </td>
                    <td className="px-5 py-3 text-slate-400 font-mono text-xs">
                      {tx.balance_after != null ? fmt(tx.balance_after) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">
                      {tx.duration_seconds ? `${tx.duration_seconds}s` : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500 max-w-[120px] truncate">
                      {tx.deployment_id?.slice(0, 8) || '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 max-w-[200px] truncate">{tx.description || '—'}</td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between text-sm text-slate-400">
            <span>{txs.length} records shown</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                Previous
              </button>
              <button disabled={txs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
