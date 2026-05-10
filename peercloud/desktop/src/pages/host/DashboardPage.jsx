import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { getEarnings } from '../../api/host';
import { getRunningWorkloads, stopWorkload } from '../../api/workloads';
import StatCard from '../../components/shared/StatCard';
import WorkloadCard from '../../components/host/WorkloadCard';
import Badge from '../../components/shared/Badge';

export default function DashboardPage() {
  const { token } = useAuthStore();
  const [earnings, setEarnings] = useState(0);
  const [workloads, setWorkloads] = useState([]);

  useEffect(() => {
    async function load() {
      const eRes = await getEarnings(token);
      if (eRes.success) setEarnings(eRes.data.credits);

      const wRes = await getRunningWorkloads();
      if (wRes.success) setWorkloads(wRes.data);
    }
    load();
    
    // Auto-refresh workloads
    const interval = setInterval(async () => {
      const wRes = await getRunningWorkloads();
      if (wRes.success) setWorkloads(wRes.data);
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  const handleStop = async (id) => {
    await stopWorkload(id);
    const wRes = await getRunningWorkloads();
    if (wRes.success) setWorkloads(wRes.data);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
        <Badge status="online" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Credits Earned" value={earnings.toFixed(2)} unit="CR" />
        <StatCard title="Uptime (7d)" value="99.9" unit="%" />
        <StatCard title="Active Workloads" value={workloads.length} />
      </div>

      <h2 className="text-xl font-bold text-gray-900 mb-4">Running Workloads</h2>
      {workloads.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg border border-gray-200 text-gray-500">
          No workloads currently assigned to your node.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {workloads.map(w => (
            <WorkloadCard key={w.id} workload={w} onStop={handleStop} />
          ))}
        </div>
      )}
    </div>
  );
}
