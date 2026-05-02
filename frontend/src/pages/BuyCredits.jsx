import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, ShieldCheck, Zap, ArrowLeft, 
  CheckCircle2, DollarSign, Wallet, Star
} from 'lucide-react';

const PACKS = [
  { id: 'starter', name: 'Starter', credits: 100, price: 5, color: 'from-blue-500 to-cyan-400', icon: Wallet, desc: 'Perfect for small side projects.' },
  { id: 'pro', name: 'Pro', credits: 500, price: 20, color: 'from-edge-blue to-purple-500', icon: Zap, desc: 'The most popular choice for devs.', popular: true },
  { id: 'whale', name: 'Whale', credits: 2500, price: 75, color: 'from-orange-500 to-rose-500', icon: Star, desc: 'Enterprise power at scale.' },
];

export default function BuyCredits() {
  const navigate = useNavigate();
  const [selectedPack, setSelectedPack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    // Mock processing delay
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    setSuccess(true);
    // In a real app, we'd hit api.post('/credits/add') here
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }} 
          animate={{ scale: 1 }} 
          className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/50"
        >
          <CheckCircle2 className="w-12 h-12 text-green-400" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-white">Purchase Successful!</h2>
          <p className="text-slate-400">Your account balance has been updated with {selectedPack?.credits} credits.</p>
        </div>
        <button onClick={() => navigate('/credits')} className="btn-primary px-8">
          View Balance
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="flex items-center space-x-4">
        <button onClick={() => navigate('/credits')} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white">Top Up Balance</h1>
          <p className="text-slate-400">Choose a credit package to fuel your deployments.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACKS.map((pack) => (
          <motion.div
            key={pack.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedPack(pack)}
            className={`relative glass-panel rounded-3xl p-8 cursor-pointer border-2 transition-all overflow-hidden ${
              selectedPack?.id === pack.id ? 'border-edge-blue bg-edge-blue/5' : 'border-white/5 hover:border-white/10'
            }`}
          >
            {pack.popular && (
              <div className="absolute top-4 right-4 bg-edge-blue text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                Most Popular
              </div>
            )}
            
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${pack.color} flex items-center justify-center mb-6 shadow-lg shadow-black/20`}>
              <pack.icon className="w-8 h-8 text-white" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{pack.name}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{pack.desc}</p>
            
            <div className="flex items-baseline space-x-1 mb-8">
              <span className="text-4xl font-black text-white">{pack.credits}</span>
              <span className="text-slate-400 font-medium">Credits</span>
            </div>

            <div className="pt-6 border-t border-white/5 flex items-center justify-between">
              <span className="text-slate-400 text-sm">Price</span>
              <span className="text-2xl font-bold text-white">${pack.price}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedPack && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-panel p-8 rounded-3xl border border-edge-blue/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-edge-blue/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">Complete Purchase</h3>
                <p className="text-slate-400 mb-6">Securely add <span className="text-white font-bold">{selectedPack.credits} credits</span> to your account using the simulated payment processor.</p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                    <ShieldCheck className="w-4 h-4 text-green-400" />
                    <span>Secure Transaction</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full">
                    <DollarSign className="w-4 h-4 text-edge-blue" />
                    <span>No Tax</span>
                  </div>
                </div>
              </div>

              <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Package: {selectedPack.name}</span>
                  <span className="font-bold">${selectedPack.price}.00</span>
                </div>
                <div className="flex justify-between items-center text-white text-xl font-bold pt-4 border-t border-white/10">
                  <span>Total Amount</span>
                  <span>${selectedPack.price}.00</span>
                </div>
                
                <button 
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-3 text-lg mt-4 shadow-xl shadow-edge-blue/20"
                >
                  <CreditCard className="w-5 h-5" />
                  {loading ? 'Processing...' : `Pay $${selectedPack.price}.00`}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
