import React, { useState, useEffect } from 'react';

const StatCard = ({ title, value, unit, change, isPositive }) => (
  <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
    <h3 className="text-gray-400 font-medium mb-1">{title}</h3>
    <div className="flex items-baseline space-x-1">
      <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
      {unit && <span className="text-gray-500 font-medium">{unit}</span>}
    </div>
    {change && (
      <div className={`mt-3 text-sm font-medium flex items-center ${isPositive ? 'text-accent' : 'text-red-400'}`}>
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
        </svg>
        {change} from last week
      </div>
    )}
  </div>
);

export default function DashboardPage() {
  const [sysInfo, setSysInfo] = useState({ cpu: { cores: 0 }, ram: { totalGB: 0 }, disk: { totalGB: 0 } });
  
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSystemInfo().then(setSysInfo);
    } else {
      // Mock for dev
      setSysInfo({ cpu: { cores: 16 }, ram: { totalGB: 32 }, disk: { totalGB: 1000 } });
    }
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Host Dashboard</h1>
          <p className="text-gray-400">Monitor your node's performance and earnings.</p>
        </div>
        <div className="flex items-center space-x-3 bg-surface border border-white/10 px-4 py-2 rounded-xl">
          <div className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
          <span className="font-medium text-sm text-gray-200">Node Online</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Earnings" value="$245" unit=".50" change="+12.5%" isPositive={true} />
        <StatCard title="Active Workloads" value="4" change="+2" isPositive={true} />
        <StatCard title="Uptime" value="99.9" unit="%" change="Stable" isPositive={true} />
        <StatCard title="Available Cores" value={sysInfo.cpu.cores} unit="Cores" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">System Resources</h2>
            <button className="text-sm text-primary hover:text-primaryHover font-medium transition-colors">View Details</button>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">CPU Usage</span>
                <span className="text-white font-medium">42%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent w-[42%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Memory Usage ({sysInfo.ram.totalGB} GB Total)</span>
                <span className="text-white font-medium">68%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent w-[68%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] delay-150"></div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Disk Usage ({sysInfo.disk.totalGB} GB Total)</span>
                <span className="text-white font-medium">21%</span>
              </div>
              <div className="h-2 bg-background rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-accent w-[21%] rounded-full relative">
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] delay-300"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
          <div className="space-y-5">
            {[
              { id: 1, text: "Workload #894A started", time: "2m ago", type: "success" },
              { id: 2, text: "Earned 0.05 credits", time: "1h ago", type: "info" },
              { id: 3, text: "Workload #891B stopped", time: "4h ago", type: "warning" },
              { id: 4, text: "Node connected to network", time: "1d ago", type: "success" }
            ].map(item => (
              <div key={item.id} className="flex items-start space-x-3">
                <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                  item.type === 'success' ? 'bg-accent shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                  item.type === 'info' ? 'bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 
                  'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                }`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
