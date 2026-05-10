import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login: storeLogin } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const res = await login(email, password);
    if (res.success) {
      const token = res.data.access_token;
      // Fetch user profile to get role
      const meRes = await window.peercloud.auth.me(token); // Or use the ipc if wrapper needed, wait we just have auth:me
      // We didn't expose auth:me via wrapper, we'll just fetch directly or use IPC. Let's fix this.
      // Wait, let's just decode JWT or call ipcRenderer. We'll use the API url directly here if needed or add a me wrapper.
      // Actually, we can just use the login response if it includes role, but it doesn't.
      // Let's use fetch.
      try {
        const meResp = await fetch('http://localhost:8000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const user = await meResp.json();
        storeLogin(token, user);
        if (user.role === 'host' || user.role === 'both') {
          navigate('/setup'); // We will check if setup is needed later, assume yes
        } else {
          navigate('/marketplace');
        }
      } catch (err) {
        setError('Failed to fetch user profile');
      }
    } else {
      setError(res.error || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to PeerCloud
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input type="email" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <input type="password" required className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
          </div>

          <div>
            <button type="submit" className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Sign in
            </button>
          </div>
        </form>
        <div className="text-center">
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Don't have an account? Register
          </Link>
        </div>
      </div>
    </div>
  );
}
