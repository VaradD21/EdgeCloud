import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

export default function RoleSwitcher() {
  const { activeRole, switchRole } = useAuthStore();
  const navigate = useNavigate();

  const handleSwitch = (newRole) => {
    if (newRole === activeRole) return;
    switchRole(newRole);
    if (newRole === 'host') navigate('/dashboard');
    else navigate('/marketplace');
  };

  return (
    <div className="flex bg-gray-800 p-1 rounded-md">
      <button
        onClick={() => handleSwitch('buyer')}
        className={`flex-1 py-1 text-sm rounded ${activeRole === 'buyer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Buyer
      </button>
      <button
        onClick={() => handleSwitch('host')}
        className={`flex-1 py-1 text-sm rounded ${activeRole === 'host' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
      >
        Host
      </button>
    </div>
  );
}
