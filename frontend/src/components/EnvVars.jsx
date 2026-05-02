import { useState } from 'react';
import { Key, Eye, EyeOff, Trash2, Plus, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EnvVars({ deploymentId }) {
  const [vars, setVars] = useState([
    { id: 1, key: 'NODE_ENV', value: 'production', hidden: false },
    { id: 2, key: 'DATABASE_URL', value: 'postgres://user:pass@db.edgecloud.internal/main', hidden: true }
  ]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const addVar = () => {
    setVars([...vars, { id: Date.now(), key: '', value: '', hidden: false }]);
  };

  const removeVar = (id) => {
    setVars(vars.filter(v => v.id !== id));
  };

  const updateVar = (id, field, value) => {
    setVars(vars.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const toggleHidden = (id) => {
    setVars(vars.map(v => v.id === id ? { ...v, hidden: !v.hidden } : v));
  };

  const saveChanges = async () => {
    setSaving(true);
    // Mock save delay
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-edge-blue/20 rounded-lg">
            <Key className="w-5 h-5 text-edge-glow" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Environment Variables</h3>
            <p className="text-sm text-slate-400">Securely provide secrets and config to your application at runtime.</p>
          </div>
        </div>

        <div className="space-y-3 mt-6">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div>Key</div>
            <div>Value</div>
            <div className="w-20">Actions</div>
          </div>

          <AnimatePresence>
            {vars.map((v) => (
              <motion.div 
                key={v.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center"
              >
                <input
                  type="text"
                  placeholder="e.g. API_KEY"
                  value={v.key}
                  onChange={(e) => updateVar(v.id, 'key', e.target.value)}
                  className="glass-input text-sm px-4 py-2.5 font-mono"
                />
                <div className="relative">
                  <input
                    type={v.hidden ? "password" : "text"}
                    placeholder="Value"
                    value={v.value}
                    onChange={(e) => updateVar(v.id, 'value', e.target.value)}
                    className="glass-input text-sm px-4 py-2.5 font-mono w-full pr-10"
                  />
                  <button 
                    onClick={() => toggleHidden(v.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {v.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="w-20 flex justify-end">
                  <button 
                    onClick={() => removeVar(v.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
          <button 
            onClick={addVar}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Variable
          </button>
          
          <button 
            onClick={saveChanges}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              saved ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'btn-primary'
            }`}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
      
      <div className="glass-panel p-4 rounded-xl border-l-4 border-l-edge-blue bg-edge-blue/5 flex items-start gap-3">
        <Key className="w-5 h-5 text-edge-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-slate-300 leading-relaxed">
          <strong className="text-white">Pro Tip:</strong> Environment variables are injected at runtime. You must restart the deployment for new variables to take effect. Variables are encrypted at rest using AES-256.
        </div>
      </div>
    </div>
  );
}
