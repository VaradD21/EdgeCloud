import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { logout } from '../../api/auth';
import RoleSwitcher from './RoleSwitcher';

export default function Sidebar() {
  const { user, activeRole, role, logout: storeLogout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    storeLogout();
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `block px-4 py-2 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`;

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
      <div className="p-4 text-2xl font-bold border-b border-gray-800">
        PeerCloud
      </div>
      
      {role === 'both' && (
        <div className="p-4 border-b border-gray-800">
          <RoleSwitcher />
        </div>
      )}

      <div className="flex-1 p-4 space-y-2">
        {activeRole === 'host' ? (
          <>
            <NavLink to="/dashboard" className={navClass}>Dashboard</NavLink>
            <NavLink to="/workloads" className={navClass}>Workloads</NavLink>
            <NavLink to="/resources" className={navClass}>Resources</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/marketplace" className={navClass}>Marketplace</NavLink>
            <NavLink to="/deployments" className={navClass}>My Deployments</NavLink>
          </>
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <div className="text-sm text-gray-400 mb-2 truncate">{user?.email}</div>
        <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-800 rounded-md">
          Logout
        </button>
      </div>
    </div>
  );
}
