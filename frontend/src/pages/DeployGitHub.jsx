import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Search, Terminal as TerminalIcon, CheckCircle2, Play, ArrowLeft, Loader2, Cpu, Box, Cloud } from 'lucide-react';
import api from '../lib/api';

const MOCK_REPOS = [
  { id: 1, name: 'personal-blog', lang: 'Next.js', updated: '2 hours ago', private: false },
  { id: 2, name: 'api-backend', lang: 'Python', updated: '1 day ago', private: true },
  { id: 3, name: 'landing-page', lang: 'React', updated: '3 days ago', private: false },
];

export default function DeployGitHub() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Select Repo, 2: Config, 3: Building
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [search, setSearch] = useState('');
  
  // Build state
  const [buildLogs, setBuildLogs] = useState([]);
  const [buildStage, setBuildStage] = useState(0);

  const startBuild = () => {
    setStep(3);
    
    const stages = [
      { msg: 'Cloning repository...', delay: 500 },
      { msg: 'Resolving dependencies...', delay: 2000 },
      { msg: 'Building Docker image...', delay: 4000 },
      { msg: 'Pushing to EdgeCloud registry...', delay: 7000 },
      { msg: 'Deploying to edge node...', delay: 9000 },
      { msg: 'Deployment successful!', delay: 11000 },
    ];

    stages.forEach((stage, index) => {
      setTimeout(() => {
        setBuildLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${stage.msg}`]);
        setBuildStage(index + 1);
        
        if (index === stages.length - 1) {
          setTimeout(() => {
            // Mock deployment creation and redirect
            navigate('/deployments');
          }, 2000);
        }
      }, stage.delay);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Import Git Repository</h1>
          <p className="text-slate-400">Deploy your code globally in seconds.</p>
        </div>
      </header>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-8">
        {[
          { num: 1, label: 'Select Repository', icon: GitBranch },
          { num: 2, label: 'Configure', icon: Settings },
          { num: 3, label: 'Deploy', icon: Cloud }
        ].map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isPast = step > s.num;
          return (
            <div key={s.num} className={`flex items-center gap-3 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                isPast ? 'bg-edge-blue border-edge-blue text-white' : 
                isActive ? 'border-edge-blue text-edge-blue' : 'border-slate-600 text-slate-600'
              }`}>
                {isPast ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`font-semibold ${isActive || isPast ? 'text-white' : 'text-slate-500'}`}>{s.label}</span>
              {s.num !== 3 && <div className="w-12 h-px bg-slate-700 ml-4" />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search your repositories..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-edge-blue transition-colors"
              />
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
              {MOCK_REPOS.filter(r => r.name.includes(search)).map(repo => (
                <div key={repo.id} className="p-4 hover:bg-white/5 flex items-center justify-between transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                      <GitBranch className="w-6 h-6 text-slate-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-lg">{repo.name}</h3>
                        {repo.private && <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 rounded border border-slate-700">Private</span>}
                      </div>
                      <p className="text-xs text-slate-500">{repo.updated}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedRepo(repo); setStep(2); }}
                    className="btn-secondary px-6"
                  >
                    Import
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && selectedRepo && (
          <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Project Configuration</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Framework Preset</label>
                      <select className="w-full glass-input px-4 py-3 rounded-xl bg-[#0a0a0a]">
                        <option>{selectedRepo.lang}</option>
                        <option>Docker</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Build Command</label>
                      <input type="text" defaultValue="npm run build" className="w-full glass-input px-4 py-3 rounded-xl bg-[#0a0a0a] font-mono text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Start Command</label>
                      <input type="text" defaultValue="npm start" className="w-full glass-input px-4 py-3 rounded-xl bg-[#0a0a0a] font-mono text-sm" />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <h3 className="text-lg font-bold text-white mb-4">Environment Variables</h3>
                  <div className="flex gap-2">
                    <input type="text" placeholder="KEY" className="w-1/3 glass-input px-4 py-2 rounded-lg font-mono text-sm" />
                    <input type="text" placeholder="VALUE" className="w-2/3 glass-input px-4 py-2 rounded-lg font-mono text-sm" />
                    <button className="btn-secondary px-4">Add</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 space-y-4">
              <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-white mb-4">Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-slate-400"><span>Repository</span><span className="text-white font-mono">{selectedRepo.name}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Branch</span><span className="text-white font-mono flex items-center gap-1"><GitBranch className="w-3 h-3"/> main</span></div>
                  <div className="flex justify-between text-slate-400"><span>Cost</span><span className="text-green-400">$0.05 / hr</span></div>
                </div>
                <button onClick={startBuild} className="w-full btn-primary py-3 mt-6 flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Deploy
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-3xl border border-edge-blue/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-edge-blue/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="flex flex-col items-center text-center mb-8 relative z-10">
              <div className="relative w-24 h-24 mb-6">
                {buildStage < 6 ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0 border-2 border-dashed border-edge-blue/30 rounded-full" />
                    <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }} className="absolute inset-2 border-2 border-dashed border-purple-500/30 rounded-full" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Box className="w-8 h-8 text-edge-blue" />
                    </div>
                  </>
                ) : (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-full border-2 border-green-500/50">
                    <CheckCircle2 className="w-12 h-12 text-green-400" />
                  </motion.div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-white">
                {buildStage < 6 ? 'Building your project...' : 'Deployment Ready!'}
              </h2>
              <p className="text-slate-400 mt-2">
                {buildStage < 6 ? "We're packaging your code and distributing it to the edge network." : "Redirecting to deployment dashboard..."}
              </p>
            </div>

            <div className="bg-[#050505] rounded-xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto border border-white/5 relative z-10">
              {buildLogs.map((log, i) => (
                <div key={i} className="mb-1 hover:bg-white/5 px-2 rounded">
                  <span className="text-edge-blue mr-2">➜</span>{log}
                </div>
              ))}
              {buildStage < 6 && (
                <div className="flex items-center gap-2 mt-2 px-2 text-slate-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> Processing...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
// Placeholder Settings import for the stepper
function Settings() { return <div/>; }
