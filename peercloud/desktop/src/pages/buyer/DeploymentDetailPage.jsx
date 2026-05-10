import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { getDeploymentLogs, getDeploymentStats, stopDeployment } from '../../api/deployments';
import Badge from '../../components/shared/Badge';
import LogViewer from '../../components/buyer/LogViewer';
import ResourceGraph from '../../components/buyer/ResourceGraph';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import axios from 'axios';

export default function DeploymentDetailPage() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    // We didn't create a specific getDeployment route in IPC wrapper, we fetch via axios directly or reuse existing.
    async function loadDeployment() {
      try {
        const res = await axios.get(`http://localhost:8000/deployments/${id}`, { headers: { Authorization: `Bearer ${token}` }});
        setDeployment(res.data);
      } catch (err) {
        console.error("Failed to load deployment");
      }
    }
    loadDeployment();
    
    async function loadTelemetry() {
      const logRes = await getDeploymentLogs(token, id);
      if (logRes.success) setLogs(logRes.data);
      
      const statsRes = await getDeploymentStats(token, id);
      if (statsRes.success) setStats(statsRes.data);
    }
    loadTelemetry();

    const interval = setInterval(loadTelemetry, 5000);
    return () => clearInterval(interval);
  }, [id, token]);

  const handleStop = async () => {
    await stopDeployment(token, id);
    setShowConfirm(false);
    navigate('/deployments');
  };

  if (!deployment) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{deployment.name}</h1>
          <a href={`http://${deployment.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            {deployment.subdomain}
          </a>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Badge status={deployment.status} />
          {deployment.status === 'running' && (
            <button onClick={() => setShowConfirm(true)} className="text-red-600 hover:text-red-800 text-sm font-medium">
              Stop Deployment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Usage</h3>
          <ResourceGraph data={stats} />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Console Logs</h3>
          <div className="flex-1">
            <LogViewer logs={logs} />
          </div>
        </div>
      </div>

      <ConfirmDialog 
        isOpen={showConfirm}
        title="Stop Deployment"
        message="Are you sure you want to stop this deployment? It will be permanently deleted."
        onConfirm={handleStop}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
