import React from 'react';

export default function Badge({ status }) {
  const colors = {
    running: 'bg-green-100 text-green-800',
    online: 'bg-green-100 text-green-800',
    stopped: 'bg-gray-100 text-gray-800',
    failed: 'bg-red-100 text-red-800',
    available: 'bg-blue-100 text-blue-800'
  };

  const className = colors[status.toLowerCase()] || 'bg-gray-100 text-gray-800';

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${className}`}>
      {status}
    </span>
  );
}
