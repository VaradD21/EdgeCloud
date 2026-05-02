import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Play, Square, RefreshCw, Trash2, ArrowLeft,
  Terminal, RotateCcw, Clock, DollarSign, Cpu, HardDrive, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StatusBadge, SkeletonCard, ConfirmModal, Alert } from '../components/ui';
import TerminalViewer from '../components/TerminalViewer';
import EnvVars from '../components/EnvVars';
import MetricsChart from '../components/MetricsChart';

function formatUptime(startedAt) {
  if (!startedAt) return '—';
  const secs = Math.floor((Date.now() - new Date(startedAt)) / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function DeploymentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [dep, setDep]     = useState(null);
  const [logs, setLogs]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [alert, setAlert]   = useState(null); // { type, message }
  const [confirmDelete, setConfirmDelete] = useState(false);
  const logEndRef = useRef(null);
  const logIntervalRef = useRef(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchDep = useCallback(async () => {
    try {
      const r = await api.get(`/deployments/${id}`);
      setDep(r.data);
    } catch {
      showAlert('error', 'Failed to load deployment details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const r = await api.get(`/deployments/${id}/logs`);
      setLogs(Array.isArray(r.data) ? r.data : r.data.logs || []);
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      // silent — logs may not exist yet
    } finally {
      setLogLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDep();
    fetchLogs();
    logIntervalRef.current = setInterval(fetchLogs, 5000);
    return () => clearInterval(logIntervalRef.current);
  }, [fetchDep, fetchLogs]);

  const action = async (verb) => {
    setActionLoading(verb);
    try {
      await api.post(`/deployments/${id}/${verb}`);
      showAlert('success', `Deployment ${verb}ed successfully`);
      await fetchDep();
    } catch (e) {
      showAlert('error', e.response?.data?.detail || `Failed to ${verb} deployment`);
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setActionLoading('delete');
    try {
      await api.delete(`/deployments/${id}`);
      navigate('/deployments');
    } catch (e) {
      showAlert('error', e.response?.data?.detail || 'Failed to delete deployment');
    } finally {
      setActionLoading('');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-white/10 rounded w-40 animate-pulse" />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={8} />
      </div>
    );
  }

  if (!dep) return null;

  const canStart   = ['stopped', 'paused', 'failed'].includes(dep.status);
  const canStop    = ['running', 'paused'].includes(dep.status);
  const canRestart = ['running'].includes(dep.status);

  return (
    <div className="space-y-6">
      {confirmDelete && (
        <ConfirmModal
          title="Delete Deployment"
          message={`This will permanently delete "${dep.name}" and stop all running containers. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/deployments')}
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{dep.name}</h1>
          <p className="text-sm text-slate-500 font-mono">{dep.docker_image}</p>
        </div>
        <div className="ml-auto">
          <StatusBadge status={dep.status} />
        </div>
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      <div className="flex gap-6 border-b border-white/10 mb-6">
        {['overview', 'logs', 'settings'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold capitalize transition-colors relative ${
              activeTab === tab ? 'text-edge-glow' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-edge-glow" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Uptime',      value: formatUptime(dep.started_at), icon: Clock,     color: 'text-blue-400'   },
                  { label: 'Total Cost',  value: `$${(dep.total_cost ?? 0).toFixed(4)}`, icon: DollarSign, color: 'text-green-400' },
                  { label: 'Restarts',    value: dep.restart_count ?? 0,        icon: RefreshCw, color: 'text-purple-400' },
                  { label: 'Node',        value: dep.node_id?.slice(0, 8) + '…', icon: Cpu,      color: 'text-orange-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="glass-panel rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-4 h-4 ${color}`} />
                      <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">{label}</span>
                    </div>
                    <p className="text-lg font-bold text-white truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* Subdomain */}
              {dep.subdomain && (
                <div className="glass-panel rounded-xl p-4 flex items-center gap-3">
                  <HardDrive className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider flex-shrink-0">Endpoint</span>
                  <a href={`http://${dep.subdomain}`} target="_blank" rel="noreferrer" className="font-mono text-sm text-edge-glow hover:underline truncate">
                    {dep.subdomain}
                  </a>
                </div>
              )}

              {/* Metrics Graphs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-bold text-white">CPU Usage (24h)</h3>
                  </div>
                  <MetricsChart type="cpu" color="#60A5FA" dataKey="cpu" liveValue={dep.cpu_usage} />
                </div>
                <div className="glass-panel rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white">Memory Usage (24h)</h3>
                  </div>
                  <MetricsChart type="ram" color="#C084FC" dataKey="ram" liveValue={dep.ram_usage} />
                </div>
              </div>

              {dep.last_error && (
                <Alert type="error" message={dep.last_error} />
              )}

              {/* Controls */}
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Controls</h2>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => action('start')}
                    disabled={!canStart || !!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                      bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'start' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Start
                  </button>
                  <button
                    onClick={() => action('stop')}
                    disabled={!canStop || !!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                      bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'stop' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                    Stop
                  </button>
                  <button
                    onClick={() => action('restart')}
                    disabled={!canRestart || !!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                      bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'restart' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Restart
                  </button>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ml-auto
                      bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30
                      disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {actionLoading === 'delete' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <TerminalViewer logs={logs} fetchLogs={fetchLogs} loading={logLoading} />
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <EnvVars deploymentId={dep.id} />
              
              <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
                <h3 className="text-lg font-bold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-sm text-slate-400 mb-4">Once you delete a deployment, there is no going back. Please be certain.</p>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all
                    bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                >
                  <Trash2 className="w-4 h-4" /> Delete Deployment
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
