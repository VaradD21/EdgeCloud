import React, { useState, useEffect } from 'react';
import { getResourceConfig, saveResourceConfig, getHardwareInfo } from '../../api/host';
import ResourceSlider from '../../components/host/ResourceSlider';

export default function ResourcePage() {
  const [config, setConfig] = useState({ cpuCores: 1, ramGb: 1, diskGb: 10 });
  const [hw, setHw] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const hwRes = await getHardwareInfo();
      if (hwRes.success) setHw(hwRes.data);
      
      const confRes = await getResourceConfig();
      if (confRes.success && confRes.data) {
        setConfig(confRes.data);
      } else if (hwRes.success) {
        setConfig({
          cpuCores: Math.max(1, hwRes.data.cpuCores - 2),
          ramGb: Math.max(1, hwRes.data.ramTotalGb - 2),
          diskGb: Math.max(10, hwRes.data.diskFreeGb - 10)
        });
      }
    }
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    await saveResourceConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (!hw) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Resource Allocation</h1>
      <p className="text-sm text-gray-500 mb-8">
        Adjust the resources your node makes available to buyers. Changes apply to new workloads only.
      </p>

      <form onSubmit={handleSave}>
        <div className="space-y-6">
          <ResourceSlider 
            label="CPU Cores" 
            value={config.cpuCores} 
            min={1} 
            max={Math.max(1, hw.cpuCores - 1)} 
            unit="Cores" 
            onChange={(val) => setConfig({...config, cpuCores: val})} 
          />
          <ResourceSlider 
            label="RAM" 
            value={config.ramGb} 
            min={1} 
            max={Math.max(1, hw.ramTotalGb - 1)} 
            unit="GB" 
            onChange={(val) => setConfig({...config, ramGb: val})} 
          />
          <ResourceSlider 
            label="Disk" 
            value={config.diskGb} 
            min={10} 
            max={Math.max(10, hw.diskFreeGb - 5)} 
            unit="GB" 
            onChange={(val) => setConfig({...config, diskGb: val})} 
          />
        </div>

        <div className="mt-10 flex items-center gap-4">
          <button type="submit" className="bg-blue-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-blue-700">
            Save Changes
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">Saved successfully!</span>}
        </div>
      </form>
    </div>
  );
}
