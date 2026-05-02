import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';
import { Activity, Cpu, HardDrive, Zap, CreditCard, Clock, PlayCircle, StopCircle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import GlobalMap from '../components/GlobalMap';

export default function Dashboard() {
  const { token, user, setUser } = useAuthStore();
  const [wsData, setWsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    if (!user) fetchUser();
  }, [user, setUser]);

  // Connect WebSocket
  useEffect(() => {
    if (!token || !user) return;
    
    const roleEndpoint = user.role === 'buyer' ? '/ws/buyer' : '/ws/host';
    const wsUrl = `ws://localhost:8000${roleEndpoint}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWsData(data);
      setLoading(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setLoading(false);
    };

    return () => ws.close();
  }, [token, user]);

  if (loading || !user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-edge-blue"></div>
      </div>
    );
  }

  // --- BUYER DASHBOARD ---
  if (user.role === 'buyer') {
    const deployments = wsData?.deployments || [];
    return (
      <div className="space-y-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Buyer Overview</h1>
          <p className="text-slate-400">Manage your cloud deployments and credits.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-edge-blue/20 rounded-full blur-xl group-hover:bg-edge-blue/30 transition-all" />
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <CreditCard className="w-6 h-6 text-edge-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Account Balance</p>
                <h3 className="text-3xl font-bold text-white">$ {wsData?.credit_balance?.toFixed(2) || '0.00'} <span className="text-sm text-edge-blue font-semibold uppercase tracking-wider">USD</span></h3>
              </div>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-edge-purple/20 rounded-full blur-xl group-hover:bg-edge-purple/30 transition-all" />
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Activity className="w-6 h-6 text-edge-purple" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Active Deployments</p>
                <h3 className="text-3xl font-bold text-white">{deployments.length}</h3>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/20 rounded-full blur-xl group-hover:bg-green-500/30 transition-all" />
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">Total Monthly Spend</p>
                <h3 className="text-3xl font-bold text-white">$ {(deployments.length * 1.45).toFixed(2)}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Edge Network Topology</h2>
          <GlobalMap />
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Live Deployments</h2>
          {deployments.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl text-center border-dashed border-2 border-white/10">
              <Zap className="w-12 h-12 text-slate-500 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-white mb-2">No active deployments</h3>
              <p className="text-slate-400 mb-6">Head to the marketplace to rent high-performance nodes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {deployments.map((dep, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={dep.id} 
                  className="glass-panel p-6 rounded-2xl flex flex-col"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="relative flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dep.status === 'running' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 ${dep.status === 'running' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        </span>
                        <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{dep.subdomain.split('.')[0]}</h3>
                      </div>
                      <p className="text-sm text-slate-400 font-mono bg-black/20 px-2 py-1 rounded inline-block">{dep.docker_image}</p>
                    </div>
                    <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-slate-300 capitalize flex items-center space-x-1">
                      {dep.status === 'running' ? <PlayCircle className="w-3 h-3 text-green-400" /> : <StopCircle className="w-3 h-3 text-yellow-400" />}
                      <span>{dep.status}</span>
                    </span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span>{dep.runtime_minutes} mins</span>
                    </div>
                    <a 
                      href={`http://${dep.subdomain}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-edge-blue hover:text-edge-glow text-sm font-medium transition-colors"
                    >
                      Open App &rarr;
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- HOST DASHBOARD ---
  const nodes = wsData?.nodes || [];
  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Host Dashboard</h1>
        <p className="text-slate-400">Monitor your bare-metal performance and reputation.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500">⭐</div>
            <p className="text-sm font-medium text-slate-400">Reputation Score</p>
          </div>
          <h3 className="text-3xl font-bold text-white ml-12">{wsData?.rating_score?.toFixed(1) || '0.0'}</h3>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl">
           <div className="flex items-center space-x-4 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Clock className="w-5 h-5"/></div>
            <p className="text-sm font-medium text-slate-400">Total Uptime</p>
          </div>
          <h3 className="text-3xl font-bold text-white ml-12">{wsData?.total_uptime_hours?.toFixed(1) || '0.0'} <span className="text-sm text-slate-500">hrs</span></h3>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-white mb-4">My Nodes</h2>
        {nodes.length === 0 ? (
          <p className="text-slate-400">No nodes registered. Download the agent to start earning.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {nodes.map(node => (
              <div key={node.id} className="glass-panel p-6 rounded-2xl border-l-4 border-l-edge-blue">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                      <Server className="w-5 h-5 text-slate-400" />
                      <span>{node.name || 'Unnamed Node'}</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">ID: {node.id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${node.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {node.status}
                    </span>
                    <p className="text-xs text-slate-500 mt-2">Ping: {node.seconds_since_heartbeat}s ago</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400 flex items-center"><Cpu className="w-4 h-4 mr-1"/> CPU</span>
                      <span className="text-white font-mono">{node.cpu_used_percent}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5">
                      <div className="bg-edge-blue h-1.5 rounded-full" style={{ width: `${node.cpu_used_percent}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400 flex items-center"><HardDrive className="w-4 h-4 mr-1"/> RAM</span>
                      <span className="text-white font-mono">{node.ram_used_percent}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5">
                      <div className="bg-edge-purple h-1.5 rounded-full" style={{ width: `${node.ram_used_percent}%` }}></div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-center items-center">
                    <span className="text-3xl font-bold text-white">{node.active_deployments}</span>
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Apps</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
