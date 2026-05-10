import React from 'react';

export default function StatCard({ title, value, unit }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>
    </div>
  );
}
