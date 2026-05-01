import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Network, Cpu, HardDrive, ToggleLeft, ToggleRight, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatusBadge, SkeletonCard, Alert } from '../components/ui';

function UsageBar({ label, percent, color }) {
  const pct = Math.min(Math.max(percent ?? 0, 0), 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-mono">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Nodes() {
  const [nodes, setNodes]       = useState([]);
  const [host,  setHost]        = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState('');
  const [alert, setAlert]       = useState(null);
  const [limits, setLimits]     = useState({}); // nodeId → { cpu_limit, ram_limit }

  const flash = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [hostRes, nodesRes] = await Promise.all([
          api.get('/hosts/me'),
          api.get('/nodes'),
        ]);
        setHost(hostRes.data);
        setNodes(nodesRes.data);
        // Init sliders from current values
        const initLimits = {};
        nodesRes.data.forEach(n => {
          initLimits[n.id] = {
            max_cpu_percent: n.max_cpu_percent ?? 100,
            max_ram_percent: n.max_ram_percent ?? 100,
          };
        });
        setLimits(initLimits);
      } catch {
        flash('error', 'Failed to load node data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleNode = async (node) => {
    const newEnabled = !node.enabled;
    setSaving(node.id + '-toggle');
    try {
      await api.patch(`/nodes/${node.id}/limits`, { enabled: newEnabled });
      setNodes(ns => ns.map(n => n.id === node.id ? { ...n, enabled: newEnabled } : n));
    } catch (e) {
      flash('error', e.response?.data?.detail || 'Failed to toggle node');
    } finally {
      setSaving('');
    }
  };

  const saveLimits = async (nodeId) => {
    setSaving(nodeId + '-limits');
    try {
      await api.patch(`/nodes/${nodeId}/limits`, limits[nodeId]);
      flash('success', 'Limits updated');
    } catch (e) {
      flash('error', e.response?.data?.detail || 'Failed to update limits');
    } finally {
      setSaving('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/10 rounded w-40 animate-pulse mb-8" />
        {[1,2].map(i => <SkeletonCard key={i} lines={5} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Nodes</h1>
        <p className="text-slate-400">
          {host ? `Host: ${host.display_name}` : 'Manage your compute nodes and resource limits.'}
        </p>
      </header>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {nodes.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center border-dashed border-2 border-white/10 flex flex-col items-center">
          <Network className="w-14 h-14 text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No nodes registered</h3>
          <p className="text-slate-400 max-w-sm">Register a node using the agent CLI to start offering compute.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {nodes.map((node, idx) => (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="glass-panel rounded-2xl p-6 space-y-5"
            >
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-edge-blue/15 rounded-xl">
                    <Network className="w-5 h-5 text-edge-glow" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{node.name || `Node ${node.id.slice(0, 8)}`}</p>
                    <p className="text-xs text-slate-500 font-mono">{node.id.slice(0, 16)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={node.status} />
                  <button
                    onClick={() => toggleNode(node)}
                    disabled={saving === node.id + '-toggle'}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 transition-all text-slate-300"
                  >
                    {saving === node.id + '-toggle'
                      ? <RefreshCw className="w-4 h-4 animate-spin" />
                      : node.enabled
                        ? <ToggleRight className="w-5 h-5 text-green-400" />
                        : <ToggleLeft className="w-5 h-5 text-slate-500" />
                    }
                    {node.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Usage bars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase">CPU</span>
                    <span className="ml-auto text-xs text-slate-500">{node.cpu_total} cores total</span>
                  </div>
                  <UsageBar label="Usage"    percent={node.cpu_usage_percent} color="bg-blue-500" />
                  <UsageBar label="Reserved" percent={node.cpu_reserved ? (node.cpu_reserved / node.cpu_total) * 100 : 0} color="bg-purple-500" />
                </div>
                <div className="space-y-3 bg-black/20 rounded-xl p-4 border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-slate-300 uppercase">RAM</span>
                    <span className="ml-auto text-xs text-slate-500">{node.ram_total} GB total</span>
                  </div>
                  <UsageBar label="Usage"    percent={node.ram_usage_percent} color="bg-orange-500" />
                  <UsageBar label="Reserved" percent={node.ram_reserved ? (node.ram_reserved / node.ram_total) * 100 : 0} color="bg-red-500" />
                </div>
              </div>

              {/* Limit sliders */}
              <div className="space-y-4 bg-black/20 rounded-xl p-4 border border-white/5">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-3">Resource Limits</p>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <label className="text-slate-400 flex items-center gap-1.5"><Cpu className="w-3 h-3"/>CPU Limit (%)</label>
                    <span className="text-white font-mono font-semibold">{limits[node.id]?.max_cpu_percent ?? 100}%</span>
                  </div>
                  <input type="range" min="1" max="100" step="1"
                    value={limits[node.id]?.max_cpu_percent ?? 100}
                    onChange={e => setLimits(l => ({ ...l, [node.id]: { ...l[node.id], max_cpu_percent: parseFloat(e.target.value) } }))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <label className="text-slate-400 flex items-center gap-1.5"><HardDrive className="w-3 h-3"/>RAM Limit (%)</label>
                    <span className="text-white font-mono font-semibold">{limits[node.id]?.max_ram_percent ?? 100}%</span>
                  </div>
                  <input type="range" min="1" max="100" step="1"
                    value={limits[node.id]?.max_ram_percent ?? 100}
                    onChange={e => setLimits(l => ({ ...l, [node.id]: { ...l[node.id], max_ram_percent: parseFloat(e.target.value) } }))}
                    className="w-full accent-orange-500"
                  />
                </div>
                <button
                  onClick={() => saveLimits(node.id)}
                  disabled={saving === node.id + '-limits'}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                >
                  {saving === node.id + '-limits' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Limits
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
