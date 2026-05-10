import React, { useState, useEffect } from 'react';
import { getListings } from '../../api/marketplace';
import { useAuthStore } from '../../store/authStore';
import HostCard from '../../components/buyer/HostCard';

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [minCpu, setMinCpu] = useState('');
  const [minRam, setMinRam] = useState('');
  const { token } = useAuthStore();

  useEffect(() => {
    loadListings();
  }, [token]); // Run once on mount

  const loadListings = async () => {
    const filters = {};
    if (minCpu) filters.minCpu = minCpu;
    if (minRam) filters.minRam = minRam;
    
    const res = await getListings(token, filters);
    if (res.success) setListings(res.data);
  };

  const handleFilter = (e) => {
    e.preventDefault();
    loadListings();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Marketplace</h1>
      
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-8">
        <form onSubmit={handleFilter} className="flex gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min CPU Cores</label>
            <input type="number" value={minCpu} onChange={e => setMinCpu(e.target.value)} className="w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="e.g. 2" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Min RAM (GB)</label>
            <input type="number" value={minRam} onChange={e => setMinRam(e.target.value)} className="w-32 px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="e.g. 4" />
          </div>
          <button type="submit" className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-1.5 rounded-md text-sm font-medium border border-gray-300">
            Filter
          </button>
        </form>
      </div>

      {listings.length === 0 ? (
        <div className="text-center text-gray-500 mt-10">No hosts available matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(host => (
            <HostCard key={host.id} host={host} />
          ))}
        </div>
      )}
    </div>
  );
}
