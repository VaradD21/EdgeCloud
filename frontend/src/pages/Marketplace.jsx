import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import {
  Server, Cpu, HardDrive, Database, DollarSign, Activity, Zap,
  Star, Shield, TrendingUp, SlidersHorizontal, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkeletonCard } from '../components/ui';

function Badge({ label, variant }) {
  const map = {
    value:   'bg-green-500/20 text-green-400 border-green-500/30',
    perf:    'bg-purple-500/20 text-purple-400 border-purple-500/30',
    popular: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${map[variant] || 'bg-white/10 text-slate-400'}`}>
      {label}
    </span>
  );
}

function StarRating({ score }) {
  const pct = Math.min((score / 10) * 5, 5); // 0-10 → 0-5 stars
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= pct ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
      ))}
      <span className="text-xs text-slate-400 ml-1">{score?.toFixed(1) ?? '—'}</span>
    </div>
  );
}

const SORTS = [
  { key: 'price_asc',   label: 'Price ↑' },
  { key: 'price_desc',  label: 'Price ↓' },
  { key: 'rating_desc', label: 'Best Rated' },
  { key: 'cpu_desc',    label: 'Most CPU'  },
];

export default function Marketplace() {
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [sort, setSort]         = useState('price_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minCpu: 0, maxCpu: 64,
    minRam: 0, maxRam: 512,
    minPrice: 0, maxPrice: 10,
  });

  useEffect(() => {
    api.get('/listings')
      .then(r => setListings(r.data.filter(l => l.status === 'available')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const processed = useMemo(() => {
    let out = listings.filter(l =>
      l.cpu_offered      >= filters.minCpu   &&
      l.cpu_offered      <= filters.maxCpu   &&
      l.ram_offered_gb   >= filters.minRam   &&
      l.ram_offered_gb   <= filters.maxRam   &&
      l.price_per_hour   >= filters.minPrice &&
      l.price_per_hour   <= filters.maxPrice
    );
    if (sort === 'price_asc')   out = [...out].sort((a, b) => a.price_per_hour - b.price_per_hour);
    if (sort === 'price_desc')  out = [...out].sort((a, b) => b.price_per_hour - a.price_per_hour);
    if (sort === 'rating_desc') out = [...out].sort((a, b) => (b.host_rating ?? 0) - (a.host_rating ?? 0));
    if (sort === 'cpu_desc')    out = [...out].sort((a, b) => b.cpu_offered - a.cpu_offered);
    return out;
  }, [listings, sort, filters]);

  // Badge assignment logic
  const getBadges = (listing, allListings) => {
    const badges = [];
    const prices = allListings.map(l => l.price_per_hour);
    const minPrice = Math.min(...prices);
    const cpus = allListings.map(l => l.cpu_offered);
    const maxCpu = Math.max(...cpus);
    if (listing.price_per_hour <= minPrice * 1.2) badges.push({ label: '💰 Best Value', variant: 'value' });
    if (listing.cpu_offered >= maxCpu * 0.8)      badges.push({ label: '⚡ High Performance', variant: 'perf' });
    if ((listing.host_rating ?? 0) >= 8.0)        badges.push({ label: '⭐ Top Rated', variant: 'popular' });
    return badges;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-white/10 rounded w-64 animate-pulse mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} lines={4} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap justify-between items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Compute Marketplace</h1>
          <p className="text-slate-400">
            {processed.length} node{processed.length !== 1 ? 's' : ''} available · bare-metal from the community.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="relative">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="glass-input pl-3 pr-8 py-2 text-sm appearance-none cursor-pointer"
            >
              {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(s => !s)}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-all ${showFilters ? 'border-edge-blue text-edge-glow bg-edge-blue/10' : 'border-white/10 text-slate-400 hover:bg-white/10'}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>
      </header>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel rounded-2xl p-5 overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {[
                { label: 'Min CPU', key: 'minCpu', max: 64  },
                { label: 'Max CPU', key: 'maxCpu', max: 64  },
                { label: 'Min RAM (GB)', key: 'minRam', max: 512 },
                { label: 'Max RAM (GB)', key: 'maxRam', max: 512 },
                { label: 'Min Price (Cr/hr)', key: 'minPrice', max: 10, step: 0.01 },
                { label: 'Max Price (Cr/hr)', key: 'maxPrice', max: 10, step: 0.01 },
              ].map(({ label, key, max, step = 1 }) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-mono">{filters[key]}</span>
                  </div>
                  <input type="range" min={0} max={max} step={step}
                    value={filters[key]}
                    onChange={e => setFilters(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                    className="w-full accent-edge-blue"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {processed.length === 0 ? (
        <div className="glass-panel p-16 rounded-2xl text-center border-dashed border-2 border-white/10 flex flex-col items-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
            <Zap className="w-10 h-10 text-slate-500 opacity-50" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">No nodes match your filters</h3>
          <p className="text-slate-400 max-w-md mx-auto">Adjust the filters above or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {processed.map((listing, idx) => {
            const badges = getBadges(listing, listings);
            return (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                key={listing.id}
                className="glass-panel rounded-2xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300"
              >
                {/* Card header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-edge-blue/10 rounded-full blur-2xl group-hover:bg-edge-blue/20 transition-all pointer-events-none" />

                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-edge-blue/20 rounded-xl">
                        <Server className="w-6 h-6 text-edge-glow" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-white">{listing.host_display_name || `Node ${idx + 1}`}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Activity className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-slate-400">Online</span>
                          {listing.node_status === 'online' && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#4ade80]" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-white">{listing.price_per_hour.toFixed(3)}</span>
                      <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Cr / Hr</span>
                    </div>
                  </div>

                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 relative z-10">
                      {badges.map(b => <Badge key={b.label} {...b} />)}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {/* Specs */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <Cpu className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 uppercase font-semibold">vCPU</span>
                      </div>
                      <span className="text-lg font-bold text-white">{listing.cpu_offered} Cores</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 mb-1">
                        <HardDrive className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 uppercase font-semibold">Memory</span>
                      </div>
                      <span className="text-lg font-bold text-white">{listing.ram_offered_gb} GB</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-xl border border-white/5 col-span-2 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-400 uppercase font-semibold">NVMe</span>
                      </div>
                      <span className="text-base font-bold text-white">{listing.storage_offered_gb} GB</span>
                    </div>
                  </div>

                  {/* Rating + uptime */}
                  <div className="flex items-center justify-between mb-5 py-3 border-t border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">Reliability</span>
                      <StarRating score={listing.host_rating ?? 5} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-400">
                        {listing.uptime_pct != null ? `${listing.uptime_pct.toFixed(1)}% uptime` : 'Active'}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/deploy/${listing.id}`}
                    className="w-full btn-primary block text-center shadow-none hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                  >
                    Deploy Workload
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
