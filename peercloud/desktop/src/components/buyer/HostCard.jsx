import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function HostCard({ host }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{host.host_display_name}</h3>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            ★ {host.host_rating}
          </span>
        </div>
        
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>CPU Cores</span>
            <span className="font-medium">{host.cpu_offered}</span>
          </div>
          <div className="flex justify-between">
            <span>RAM</span>
            <span className="font-medium">{host.ram_offered_gb} GB</span>
          </div>
          <div className="flex justify-between">
            <span>Disk</span>
            <span className="font-medium">{host.storage_offered_gb} GB</span>
          </div>
          <div className="flex justify-between mt-4 pt-4 border-t border-gray-100">
            <span className="font-medium text-gray-900">Price/hr</span>
            <span className="font-bold text-green-600">{host.price_per_hour} credits</span>
          </div>
        </div>
      </div>
      
      <button
        onClick={() => navigate(`/deploy/${host.id}`)}
        className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Deploy Here
      </button>
    </div>
  );
}
