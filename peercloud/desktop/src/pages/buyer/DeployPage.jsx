import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { createDeployment } from '../../api/deployments';
import ConfirmDialog from '../../components/shared/ConfirmDialog';

export default function DeployPage() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [pkgPath, setPkgPath] = useState('');
  const [manifestInfo, setManifestInfo] = useState(null);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectFile = async () => {
    const result = await window.peercloud.showOpenDialog({
      filters: [{ name: 'PeerCloud Package', extensions: ['peerpkg'] }],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      setPkgPath(result.filePaths[0]);
      // In a real app we might parse the zip manifest here via IPC, but for simplicity we rely on backend validation
      setManifestInfo({ name: result.filePaths[0].split('\\').pop() || 'App' });
    }
  };

  const addEnv = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnv = (index) => setEnvVars(envVars.filter((_, i) => i !== index));
  const updateEnv = (index, field, val) => {
    const newVars = [...envVars];
    newVars[index][field] = val;
    setEnvVars(newVars);
  };

  const handleDeploy = async () => {
    if (!pkgPath) return setError("Please select a .peerpkg file");
    setLoading(true);
    setError('');

    // Convert env array to object
    const envObj = {};
    envVars.forEach(v => {
      if (v.key) envObj[v.key] = v.value;
    });

    const res = await createDeployment(token, listingId, pkgPath, envObj);
    setLoading(false);
    
    if (res.success) {
      navigate(`/deployments/${res.data.id}`);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Deploy Workload</h1>
      {error && <div className="bg-red-50 text-red-500 p-3 rounded mb-6">{error}</div>}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Package (.peerpkg)</label>
        <div className="flex gap-2">
          <input type="text" readOnly value={pkgPath} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-500" placeholder="No file selected" />
          <button onClick={handleSelectFile} className="bg-gray-100 hover:bg-gray-200 border border-gray-300 px-4 py-2 rounded-md text-sm font-medium">Browse</button>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Environment Variables</label>
          <button onClick={addEnv} type="button" className="text-blue-600 text-xs font-medium hover:text-blue-800">+ Add Var</button>
        </div>
        {envVars.map((env, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input type="text" placeholder="KEY" value={env.key} onChange={e => updateEnv(i, 'key', e.target.value)} className="w-1/3 px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
            <input type="text" placeholder="VALUE" value={env.value} onChange={e => updateEnv(i, 'value', e.target.value)} className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
            <button onClick={() => removeEnv(i)} type="button" className="text-red-500 hover:text-red-700 px-2">&times;</button>
          </div>
        ))}
      </div>

      <button 
        onClick={handleDeploy} 
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-medium text-white ${loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {loading ? 'Deploying...' : 'Deploy Now'}
      </button>
    </div>
  );
}
