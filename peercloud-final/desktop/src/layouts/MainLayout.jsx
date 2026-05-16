import React from 'react';

const NavItem = ({ label, active, onClick, iconPath }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(59,130,246,0.15)]' 
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
    </svg>
    <span className="font-medium tracking-wide">{label}</span>
  </button>
);

export default function MainLayout({ children, currentPage, onNavigate }) {
  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Sidebar */}
      <div className="w-64 glass-panel border-r border-white/5 flex flex-col z-10 relative">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg flex items-center justify-center">
              <span className="font-bold text-white text-lg">P</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              PeerCloud
            </h1>
          </div>
        </div>
        
        <div className="p-4 flex-1 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-2 px-2">Host Node</div>
          <NavItem 
            label="Dashboard" 
            active={currentPage === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
            iconPath="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
          <NavItem 
            label="Workloads" 
            active={currentPage === 'workloads'} 
            onClick={() => onNavigate('workloads')}
            iconPath="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
          />
          
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 mt-8 px-2">Marketplace</div>
          <NavItem 
            label="Deploy" 
            active={currentPage === 'deploy'} 
            onClick={() => onNavigate('deploy')}
            iconPath="M13 10V3L4 14h7v7l9-11h-7z"
          />
          <NavItem 
            label="My Instances" 
            active={currentPage === 'instances'} 
            onClick={() => onNavigate('instances')}
            iconPath="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </div>
        
        <div className="p-4 border-t border-white/5">
          <NavItem 
            label="Settings" 
            active={currentPage === 'settings'} 
            onClick={() => onNavigate('settings')}
            iconPath="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px] pointer-events-none translate-x-1/3 translate-y-1/3"></div>
        
        <main className="h-full overflow-y-auto p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
