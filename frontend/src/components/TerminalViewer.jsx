import { useState, useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, RefreshCw, Trash2, Maximize2, Minimize2 } from 'lucide-react';

export default function TerminalViewer({ logs, fetchLogs, loading }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localLogs, setLocalLogs] = useState(logs || []);
  const endRef = useRef(null);
  
  useEffect(() => {
    setLocalLogs(logs || []);
  }, [logs]);

  // Removed fake log streaming

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localLogs, isFullscreen]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);
  const clearLogs = () => setLocalLogs([]);

  return (
    <div className={`glass-panel overflow-hidden transition-all duration-300 flex flex-col ${isFullscreen ? 'fixed inset-4 z-50 rounded-2xl shadow-2xl shadow-black/80' : 'rounded-2xl h-[400px]'}`}>
      <div className="px-4 py-3 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <TerminalIcon className="w-4 h-4 text-edge-glow" />
          <span className="text-sm font-semibold text-white tracking-wide">Runtime Logs</span>
          {loading && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={clearLogs} title="Clear Logs" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={fetchLogs} title="Refresh Logs" className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={toggleFullscreen} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors">
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      
      <div className="bg-[#050505] flex-1 overflow-y-auto p-4 font-mono text-xs text-[#00ff00] leading-relaxed relative">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-gradient-to-b from-transparent to-[#050505]/50" />
        
        {localLogs.length === 0 ? (
          <p className="text-slate-600 italic">Waiting for incoming log streams...</p>
        ) : (
          localLogs.map((line, i) => {
            const isError = line.toLowerCase().includes('error') || line.toLowerCase().includes('fail');
            const isWarn = line.toLowerCase().includes('warn');
            
            let colorClass = 'text-[#00ff00]'; // Hacker green
            if (isError) colorClass = 'text-red-500';
            else if (isWarn) colorClass = 'text-yellow-400';
            else if (line.includes('[SYSTEM]')) colorClass = 'text-edge-blue';

            return (
              <div key={i} className={`hover:bg-white/5 px-2 py-0.5 rounded ${colorClass}`}>
                <span className="text-slate-600 select-none mr-4 text-[10px]">{String(i + 1).padStart(4, '0')}</span>
                {line}
              </div>
            );
          })
        )}
        <div ref={endRef} className="h-4" />
      </div>
      
      <div className="px-4 py-2 bg-[#0a0a0a] border-t border-white/10 text-[10px] uppercase tracking-widest text-slate-500 flex justify-between shrink-0">
        <span>{isFullscreen ? 'Press ESC or minimize to exit' : 'Auto-refreshes every 5s'}</span>
        <span>{localLogs.length} Lines</span>
      </div>
    </div>
  );
}
