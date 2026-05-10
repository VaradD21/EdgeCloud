import React from 'react';
import Badge from '../shared/Badge';

export default function WorkloadCard({ workload, onStop }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-medium text-gray-900">{workload.id}</h4>
          <p className="text-sm text-gray-500">Status: <Badge status={workload.status} /></p>
        </div>
        <button
          onClick={() => onStop(workload.id)}
          className="text-red-600 hover:text-red-800 text-sm font-medium"
        >
          Stop
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">CPU</span>
            <span className="font-medium">{Math.round(workload.cpu || 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, workload.cpu || 0)}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">RAM</span>
            <span className="font-medium">{Math.round((workload.memory || 0) / (1024 * 1024))} MB</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full" style={{ width: `${Math.min(100, (workload.memory || 0) / (1024 * 1024 * 10))}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
