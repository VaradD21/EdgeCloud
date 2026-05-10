import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, HardDrive, ShieldCheck, LogOut, Play, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regData, setRegData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');

  const refreshStatus = async () => {
    try {
      const data = await window.edgecloud.getStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await window.edgecloud.register(regData);
      await refreshStatus();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !status) {
    return <div className="container" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Activity className="animate-pulse" size={48} color="#6366f1" />
    </div>;
  }

  if (!status?.isRegistered) {
    return (
      <div className="container">
        <div className="title-bar">EdgeCloud Node Agent</div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass registration-form"
        >
          <h2 style={{ marginBottom: 24, fontFamily: 'Outfit' }}>Register Node</h2>
          {error && <div style={{ color: '#ef4444', marginBottom: 16 }}>{error}</div>}
          <form onSubmit={handleRegister}>
            <input 
              type="email" placeholder="Host Email" 
              value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})}
              required 
            />
            <input 
              type="password" placeholder="Host Password" 
              value={regData.password} onChange={e => setRegData({...regData, password: e.target.value})}
              required 
            />
            <input 
              type="text" placeholder="Node Name (e.g. Workstation-1)" 
              value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})}
              required 
            />
            <button type="submit" style={{ width: '100%', marginTop: 12 }}>
              Initialize Node
            </button>
          </form>
          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            This will link this machine to your EdgeCloud account.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="title-bar">EdgeCloud Node Agent — {status.nodeName}</div>
      
      <header className="header">
        <div>
          <h1 style={{ fontFamily: 'Outfit', fontSize: 24 }}>Node Overview</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>ID: {status.nodeId}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className={`status-badge ${status.isRunning ? 'status-running' : 'status-stopped'}`}>
            {status.isRunning ? 'Active' : 'Paused'}
          </div>
          <button className="secondary" onClick={() => status.isRunning ? window.edgecloud.stopAgent() : window.edgecloud.startAgent()}>
            {status.isRunning ? <Square size={16} /> : <Play size={16} />}
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="glass stat-card">
          <div className="stat-label"><Cpu size={16} /> CPU Usage</div>
          <div className="stat-value">{status.system.cpuLoad.toFixed(1)}%</div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <motion.div 
              animate={{ width: `${status.system.cpuLoad}%` }}
              style={{ height: '100%', background: 'var(--accent-color)', borderRadius: 2 }} 
            />
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label"><Activity size={16} /> Memory</div>
          <div className="stat-value">{status.system.memUsed.toFixed(1)} / {status.system.memTotal.toFixed(0)} GB</div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <motion.div 
              animate={{ width: `${(status.system.memUsed / status.system.memTotal) * 100}%` }}
              style={{ height: '100%', background: '#22c55e', borderRadius: 2 }} 
            />
          </div>
        </div>
        <div className="glass stat-card">
          <div className="stat-label"><Server size={16} /> Workloads</div>
          <div className="stat-value">{status.deployments.length} Active</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Managed via Docker</div>
        </div>
      </div>

      <div className="deployment-list">
        <h3 style={{ fontFamily: 'Outfit', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} color="#6366f1" /> Running Workloads
        </h3>
        <AnimatePresence>
          {status.deployments.length === 0 ? (
            <div className="glass" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              No active workloads assigned to this node.
            </div>
          ) : (
            status.deployments.map(dep => (
              <motion.div 
                key={dep.deployment_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass deployment-card"
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{dep.docker_image}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ID: {dep.deployment_id}</div>
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Resources</div>
                    <div style={{ fontSize: 13 }}>{dep.cpu_limit} Core / {dep.ram_limit} GB</div>
                  </div>
                  <div className={`status-badge ${dep.status === 'running' ? 'status-running' : 'status-stopped'}`}>
                    {dep.status}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
