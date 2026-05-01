import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Package, DollarSign, Clock, ChevronRight, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { StatusBadge, SkeletonCard } from '../components/ui';

export default function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDeployments = () => {
    api.get('/deployments')
      .then(r => setDeployments(r.data))
      .catch(() => setError('Failed to load deployments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeployments();
    const interval = setInterval(fetchDeployments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (e, id, action) => {
    e.stopPropagation();
    try {
      await api.post(`/deployments/${id}/${action}`);
      fetchDeployments();
    } catch (err) {
      setError(`Failed to ${action} deployment`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/10 rounded w-48 animate-pulse mb-8" />
        {[1,2,3].map(i => <SkeletonCard key={i} lines={3} />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">My Deployments</h1>
        <p className="text-slate-400">Manage your active and past workloads.</p>
      </header>

      {error && (
        <div className="glass-panel rounded-xl p-4 flex items-center gap-3 text-red-400 border border-red-500/30">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {deployments.length === 0 && !error ? (
        <div className="glass-panel p-16 rounded-2xl text-center border-dashed border-2 border-white/10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Package className="w-10 h-10 text-slate-500 opacity-50" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No deployments yet</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">Head to the Marketplace and deploy your first workload.</p>
          <button onClick={() => navigate('/marketplace')} className="btn-primary">
            Browse Marketplace
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {deployments.map((dep, idx) => (
            <motion.div
              key={dep.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => navigate(`/deployments/${dep.id}`)}
              className="glass-panel rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:bg-white/5 hover:-translate-y-0.5 transition-all duration-200 group"
            >
              {/* Icon */}
              <div className="p-3 bg-edge-blue/15 rounded-xl flex-shrink-0">
                <Package className="w-6 h-6 text-edge-glow" />
              </div>

              {/* Name + image */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-base truncate">{dep.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5 font-mono">{dep.docker_image}</p>
              </div>

              {/* Status */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold flex items-center gap-1">
                  {dep.status === 'running' ? '🟢 Running' : '🔴 Stopped'}
                </span>
              </div>

              {/* Fake metrics from backend */}
              <div className="flex-shrink-0 hidden md:block w-24 space-y-1">
                 <div className="flex justify-between text-[10px] text-slate-400"><span>CPU</span><span>{dep.cpu_usage || 0}%</span></div>
                 <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all" style={{ width: `${dep.cpu_usage || 0}%` }}></div></div>
                 <div className="flex justify-between text-[10px] text-slate-400"><span>RAM</span><span>{dep.ram_usage || 0}%</span></div>
                 <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-orange-500 transition-all" style={{ width: `${dep.ram_usage || 0}%` }}></div></div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <button onClick={(e) => handleAction(e, dep.id, 'start')} className="px-3 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 text-xs font-bold">START</button>
                <button onClick={(e) => handleAction(e, dep.id, 'stop')} className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 text-xs font-bold">STOP</button>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
