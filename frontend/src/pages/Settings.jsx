import { useState, useEffect } from 'react';
import { User, Shield, Sliders, Key, LogOut, CheckCircle2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Mock user fetch for the UI polish
    setUser({ email: 'user@example.com', role: 'buyer' });
  }, []);

  const generateApiKey = () => {
    setApiKey('edge_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
        <p className="text-slate-400">Manage your profile, security preferences, and API access.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'security', label: 'Security & API', icon: Shield },
            { id: 'preferences', label: 'Preferences', icon: Sliders },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
                  isActive 
                    ? 'bg-edge-blue/10 text-edge-glow border border-edge-blue/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">Profile Information</h3>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-edge-blue to-purple-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                        {user?.email?.[0].toUpperCase() || 'U'}
                      </div>
                      <div>
                        <button className="btn-secondary px-4 py-2 text-sm">Upload Avatar</button>
                        <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 800K</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                        <input type="email" defaultValue={user?.email} className="w-full glass-input px-4 py-3 rounded-xl" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                        <input type="text" placeholder="John Doe" className="w-full glass-input px-4 py-3 rounded-xl" />
                      </div>
                      <button className="btn-primary px-6 py-2.5 mt-2">Save Changes</button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-2">Personal Access Tokens</h3>
                    <p className="text-slate-400 text-sm mb-6">Tokens allow you to use the EdgeCloud API and CLI tools. Keep them secret.</p>
                    
                    {!apiKey ? (
                      <button onClick={generateApiKey} className="btn-secondary flex items-center gap-2 px-4 py-2.5">
                        <Key className="w-4 h-4" /> Generate New Token
                      </button>
                    ) : (
                      <div className="bg-[#0a0a0a] border border-edge-blue/30 rounded-xl p-4">
                        <p className="text-xs font-bold text-edge-blue uppercase mb-2">Your New API Token</p>
                        <div className="flex items-center gap-3">
                          <code className="flex-1 bg-black/50 px-3 py-2 rounded font-mono text-sm text-slate-300 break-all">
                            {apiKey}
                          </code>
                          <button 
                            onClick={copyToClipboard}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
                          >
                            {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-slate-300" />}
                          </button>
                        </div>
                        <p className="text-xs text-red-400 mt-3">Make sure to copy your personal access token now. You won't be able to see it again!</p>
                      </div>
                    )}
                  </div>

                  <div className="glass-panel p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-6">Active Sessions</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                        <div>
                          <p className="font-semibold text-white">Windows • Chrome</p>
                          <p className="text-xs text-slate-400">Current session • IP: 192.168.1.1</p>
                        </div>
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold uppercase rounded-full">Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel p-6 rounded-2xl border border-red-500/20">
                    <h3 className="text-xl font-bold text-red-400 mb-2">Sign Out</h3>
                    <p className="text-slate-400 text-sm mb-4">Sign out of all other active sessions across all devices.</p>
                    <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                      <LogOut className="w-4 h-4" /> Sign Out Everywhere
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl space-y-6">
                    <h3 className="text-xl font-bold text-white">Platform Preferences</h3>
                    
                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                      <div>
                        <p className="font-bold text-white">Dark Mode</p>
                        <p className="text-sm text-slate-400">EdgeCloud currently only supports Dark Mode because we are cool.</p>
                      </div>
                      <div className="w-12 h-6 bg-edge-blue rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-4 border-b border-white/5">
                      <div>
                        <p className="font-bold text-white">Email Notifications</p>
                        <p className="text-sm text-slate-400">Receive alerts when your deployments fail or restart.</p>
                      </div>
                      <div className="w-12 h-6 bg-edge-blue rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                    </div>

                    <div className="py-4">
                      <label className="block font-bold text-white mb-2">Default Deployment Region</label>
                      <select className="w-full glass-input px-4 py-3 rounded-xl bg-[#0a0a0a]">
                        <option>Auto-select closest node</option>
                        <option>North America</option>
                        <option>Europe</option>
                        <option>Asia Pacific</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
