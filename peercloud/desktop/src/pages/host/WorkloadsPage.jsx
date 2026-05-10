import React, { useEffect, useState } from 'react';
import { getRunningWorkloads, stopWorkload, onWorkloadUpdate } from '../../api/workloads';
import Badge from '../../components/shared/Badge';

export default function WorkloadsPage() {
  const [workloads, setWorkloads] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await getRunningWorkloads();
      if (res.success) setWorkloads(res.data);
    }
    load();

    const interval = setInterval(load, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, []);

  const handleStop = async (id) => {
    await stopWorkload(id);
    setWorkloads(workloads.filter(w => w.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">All Workloads</h1>
      
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU %</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RAM (MB)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workloads.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">No active workloads</td>
              </tr>
            ) : workloads.map(w => (
              <tr key={w.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{w.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round(w.cpu || 0)}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Math.round((w.memory || 0) / (1024 * 1024))}</td>
                <td className="px-6 py-4 whitespace-nowrap"><Badge status={w.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleStop(w.id)} className="text-red-600 hover:text-red-900">Stop</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
