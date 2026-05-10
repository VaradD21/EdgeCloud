import React, { useEffect, useState } from 'react';
import { getMyDeployments } from '../../api/deployments';
import { useAuthStore } from '../../store/authStore';
import DeploymentRow from '../../components/buyer/DeploymentRow';

export default function DeploymentsPage() {
  const [deployments, setDeployments] = useState([]);
  const { token } = useAuthStore();

  useEffect(() => {
    async function load() {
      const res = await getMyDeployments(token);
      if (res.success) setDeployments(res.data);
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [token]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Deployments</h1>
      
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">App Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdomain</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deployments.length === 0 ? (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">You have no deployments yet.</td>
              </tr>
            ) : deployments.map(d => (
              <DeploymentRow key={d.id} deployment={d} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
