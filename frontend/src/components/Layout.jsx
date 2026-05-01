import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import {
  Cloud, LayoutDashboard, Server, LogOut, ChevronRight,
  Package, CreditCard, Settings, Network
} from 'lucide-react';
import { motion } from 'framer-motion';

const BUYER_NAV = [
  { name: 'Dashboard',    path: '/',             icon: LayoutDashboard },
  { name: 'Marketplace',  path: '/marketplace',  icon: Server },
  { name: 'Deployments',  path: '/deployments',  icon: Package },
  { name: 'Credits',      path: '/credits',      icon: CreditCard },
  { name: 'Settings',     path: '/settings',     icon: Settings },
];

const HOST_NAV = [
  { name: 'Dashboard', path: '/',        icon: LayoutDashboard },
  { name: 'Nodes',     path: '/nodes',   icon: Network },
  { name: 'Credits',   path: '/credits', icon: CreditCard },
  { name: 'Settings',  path: '/settings',icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuthStore();
  const location = useLocation();

  const navItems = user?.role === 'host' ? HOST_NAV : BUYER_NAV;

  return (
    <div className="min-h-screen flex bg-edge-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-edge-800 via-edge-900 to-black text-white">
      {/* Sidebar */}
      <aside className="w-64 glass-panel border-r border-white/5 hidden md:flex flex-col relative z-20">
        <div className="p-6 flex items-center space-x-3 border-b border-white/5">
          <div className="bg-gradient-to-br from-edge-blue to-edge-purple p-2 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Cloud className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            EdgeCloud
          </span>
        </div>

        <div className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 relative group ${
                  isActive ? 'text-white bg-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 border border-white/20 bg-white/5 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-edge-glow' : 'group-hover:text-edge-glow'}`} />
                <span className="font-medium relative z-10">{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-edge-blue" />}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5">
          <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Account</p>
            <p className="text-sm font-medium truncate">{user?.email || 'Loading...'}</p>
            <div className="mt-2 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
              <span className="text-xs text-slate-300 capitalize">{user?.role}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 text-slate-400 hover:text-red-400 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-edge-purple/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-edge-blue/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-6xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
