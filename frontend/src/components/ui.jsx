// Shared UI primitives reused across pages

// Status badge with colour coding
export function StatusBadge({ status }) {
  const map = {
    running:    'bg-green-500/20 text-green-400 border-green-500/30',
    paused:     'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    stopped:    'bg-slate-500/20 text-slate-400 border-slate-500/30',
    failed:     'bg-red-500/20 text-red-400 border-red-500/30',
    restarting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    starting:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
    online:     'bg-green-500/20 text-green-400 border-green-500/30',
    offline:    'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const cls = map[status] || 'bg-white/10 text-slate-400 border-white/10';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

// Skeleton loader card
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="glass-panel rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-white/5 rounded mb-3" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}

// Alert / toast message
export function Alert({ type = 'info', message, onClose }) {
  const map = {
    success: 'bg-green-500/20 border-green-500/40 text-green-300',
    error:   'bg-red-500/20 border-red-500/40 text-red-300',
    info:    'bg-blue-500/20 border-blue-500/40 text-blue-300',
    warning: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  };
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${map[type]}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg leading-none">×</button>
      )}
    </div>
  );
}

// Confirmation modal
export function ConfirmModal({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10 shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-8">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary px-5 py-2.5 text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all active:scale-95 ${
              danger ? 'bg-red-500/80 hover:bg-red-500 text-white' : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
