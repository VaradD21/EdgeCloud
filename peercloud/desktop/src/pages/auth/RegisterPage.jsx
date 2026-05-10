import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../api/auth';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!role) {
      setError('Please select a role');
      return;
    }
    
    const actualRole = role === 'both' ? 'host' : role; // The backend only accepts host or buyer for the schema, let's assume host. Wait, prompt says: "A user can register as host, buyer, or both."
    // Let's pass what user selects. If backend throws 400 for 'both', we will map it. But prompt says role is "host", "buyer", or "both".
    // "role selector: three options presented as clickable cards"
    
    const res = await register(email, password, actualRole);
    if (res.success) {
      navigate('/login');
    } else {
      setError(res.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create an account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div onClick={() => setRole('host')} className={`p-4 border rounded-lg cursor-pointer text-center ${role === 'host' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}>
              <h3 className="font-bold">Host</h3>
              <p className="text-sm text-gray-500">I want to share my PC</p>
            </div>
            <div onClick={() => setRole('buyer')} className={`p-4 border rounded-lg cursor-pointer text-center ${role === 'buyer' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}>
              <h3 className="font-bold">Buyer</h3>
              <p className="text-sm text-gray-500">I want to rent compute</p>
            </div>
            <div onClick={() => setRole('both')} className={`p-4 border rounded-lg cursor-pointer text-center ${role === 'both' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'}`}>
              <h3 className="font-bold">Both</h3>
              <p className="text-sm text-gray-500">Host & Rent</p>
            </div>
          </div>

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
              Register
            </button>
          </div>
        </form>
        <div className="text-center">
          <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
