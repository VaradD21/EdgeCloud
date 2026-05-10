import React from 'react';
import Sidebar from '../components/shared/Sidebar';

export default function HostLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        {children}
      </div>
    </div>
  );
}
