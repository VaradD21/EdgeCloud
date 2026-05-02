import { motion } from 'framer-motion';

export default function GlobalMap() {
  return (
    <div className="relative w-full h-64 bg-[#050505] rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />
      
      {/* Abstract Map Base */}
      <div className="relative w-full max-w-2xl h-full opacity-30">
        <svg viewBox="0 0 1000 500" className="w-full h-full fill-slate-700">
          <path d="M150,100 Q180,80 200,120 T250,150 T280,100 T350,180 T300,250 T220,280 T150,200 Z" />
          <path d="M450,80 Q500,50 550,100 T600,180 T520,220 T480,180 Z" />
          <path d="M700,120 Q750,100 800,150 T850,250 T780,300 T720,220 Z" />
          <path d="M200,350 Q250,300 300,380 T280,450 T200,420 Z" />
          <path d="M600,300 Q650,280 700,350 T650,420 T580,380 Z" />
        </svg>
      </div>

      {/* Nodes */}
      {[
        { top: '25%', left: '22%', status: 'active', delay: 0 },
        { top: '45%', left: '28%', status: 'active', delay: 0.2 },
        { top: '35%', left: '52%', status: 'active', delay: 0.4 },
        { top: '55%', left: '48%', status: 'active', delay: 0.1 },
        { top: '30%', left: '78%', status: 'active', delay: 0.3 },
        { top: '65%', left: '85%', status: 'offline', delay: 0 },
        { top: '75%', left: '62%', status: 'active', delay: 0.5 },
      ].map((node, i) => (
        <div key={i} className="absolute" style={{ top: node.top, left: node.left }}>
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: node.delay, duration: 0.5 }}
            className={`w-3 h-3 rounded-full relative z-10 ${node.status === 'active' ? 'bg-edge-blue' : 'bg-slate-600'}`}
          />
          {node.status === 'active' && (
            <motion.div
              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity, delay: node.delay }}
              className="absolute inset-0 bg-edge-blue rounded-full z-0"
            />
          )}
        </div>
      ))}
      
      <div className="absolute bottom-4 left-4 flex gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500 bg-black/40 px-4 py-2 rounded-lg backdrop-blur">
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-edge-blue shadow-[0_0_8px_#3b82f6]" /> Online Nodes</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-600" /> Offline</div>
      </div>
    </div>
  );
}
