import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getHardwareInfo, registerNode, saveResourceConfig } from '../../api/host';
import ResourceSlider from '../../components/host/ResourceSlider';

export default function SetupPage() {
  const [hw, setHw] = useState(null);
  const [name, setName] = useState('');
  const [cpu, setCpu] = useState(1);
  const [ram, setRam] = useState(1);
  const [disk, setDisk] = useState(10);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useAuthStore();

  useEffect(() => {
    async function load() {
      const res = await getHardwareInfo();
      if (res.success) {
        setHw(res.data);
        setCpu(Math.max(1, res.data.cpuCores - 2));
        setRam(Math.max(1, res.data.ramTotalGb - 2));
        setDisk(Math.max(10, res.data.diskFreeGb - 10));
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return setError('Please provide a display name');
    
    const regRes = await registerNode(token, name, cpu, ram, disk);
    if (!regRes.success) return setError(regRes.error);
    
    await saveResourceConfig({ cpuCores: cpu, ramGb: ram, diskGb: disk });
    navigate('/dashboard');
  };

  if (!hw) return <div className="p-8">Detecting hardware...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Setup Host Node</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-6">{error}</div>}
      
      <div className="bg-gray-50 p-4 rounded-lg mb-8 border border-gray-200 text-sm">
        <h3 className="font-semibold text-gray-700 mb-2">Detected Hardware</h3>
        <p>CPU: {hw.cpuModel} ({hw.cpuCores} cores)</p>
        <p>RAM: {hw.ramTotalGb} GB Total</p>
        <p>Disk: {hw.diskFreeGb} GB Free</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">Node Display Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. My Gaming Rig" />
        </div>

        <div className="space-y-6">
          <ResourceSlider label="CPU Cores to Share" value={cpu} min={1} max={Math.max(1, hw.cpuCores - 1)} unit="Cores" onChange={setCpu} />
          <ResourceSlider label="RAM to Share" value={ram} min={1} max={Math.max(1, hw.ramTotalGb - 1)} unit="GB" onChange={setRam} />
          <ResourceSlider label="Disk to Share" value={disk} min={10} max={Math.max(10, hw.diskFreeGb - 5)} unit="GB" onChange={setDisk} />
        </div>

        <div className="mt-10">
          <button type="submit" className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700">
            Complete Setup & Start Hosting
          </button>
        </div>
      </form>
    </div>
  );
}
