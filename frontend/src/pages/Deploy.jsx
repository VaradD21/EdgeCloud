import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { Server, Box, Globe, Play, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Deploy() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  
  const [name, setName] = useState('');
  const [image, setImage] = useState('nginx:latest');
  const [port, setPort] = useState(80);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const res = await api.get('/listings');
        const found = res.data.find(l => l.id === listingId);
        if (found) setListing(found);
        else setError("Listing not found or no longer available.");
      } catch (err) {
        setError("Failed to fetch listing details.");
      }
    };
    fetchListing();
  }, [listingId]);

  const handleDeploy = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/deployments', {
        listing_id: listingId,
        name,
        docker_image: image,
        container_port: parseInt(port)
      });
      navigate('/deployments');
    } catch (err) {
      setError(err.response?.data?.detail || "Deployment failed.");
      setLoading(false);
    }
  };

  if (error && !listing) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
        <button onClick={() => navigate('/marketplace')} className="btn-secondary flex items-center space-x-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => navigate('/marketplace')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Deploy Workload</h1>
          <p className="text-slate-400">Configure your container for this node.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Form */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-8 rounded-3xl"
          >
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium">
                {error}
              </div>
            )}
            
            <form onSubmit={handleDeploy} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Deployment Name</label>
                <div className="relative">
                  <Box className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full glass-input pl-12"
                    placeholder="my-web-app"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Docker Image</label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    className="w-full glass-input pl-12 font-mono text-sm"
                    placeholder="nginx:latest or username/repo:tag"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">Must be publicly accessible on Docker Hub.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Container Port</label>
                <div className="relative">
                  <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full glass-input pl-12 font-mono"
                    placeholder="80"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">The port your application listens on internally.</p>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading || !listing}
                  className="w-full btn-primary flex justify-center items-center space-x-2 py-4"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span className="font-bold text-lg">{loading ? 'Deploying...' : 'Launch Container'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Node Summary */}
        <div className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-6 rounded-3xl sticky top-8"
          >
            <h3 className="text-lg font-bold text-white mb-6 flex items-center space-x-2">
              <Server className="w-5 h-5 text-edge-blue" />
              <span>Target Node</span>
            </h3>

            {!listing ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 bg-white/5 rounded-lg"></div>
                <div className="h-12 bg-white/5 rounded-lg"></div>
                <div className="h-12 bg-white/5 rounded-lg"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">vCPU Cores</span>
                  <span className="text-white font-bold">{listing.cpu_offered}</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Memory (RAM)</span>
                  <span className="text-white font-bold">{listing.ram_offered_gb} GB</span>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Storage</span>
                  <span className="text-white font-bold">{listing.storage_offered_gb} GB</span>
                </div>
                
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-400 font-medium">Hourly Rate</span>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-white">${listing.price_per_hour.toFixed(3)}</span>
                      <span className="text-xs text-slate-500 uppercase ml-1">/ hr</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
