import React from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '../shared/Badge';

export default function DeploymentRow({ deployment }) {
  const navigate = useNavigate();

  return (
    <tr 
      onClick={() => navigate(`/deployments/${deployment.id}`)}
      className="hover:bg-gray-50 cursor-pointer"
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {deployment.name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <a href={`http://${deployment.subdomain}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
          {deployment.subdomain}
        </a>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Badge status={deployment.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {new Date(deployment.started_at).toLocaleDateString()}
      </td>
    </tr>
  );
}
