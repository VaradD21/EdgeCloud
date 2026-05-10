import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  role: null, // "host" | "buyer" | "both"
  activeRole: null, // "host" | "buyer"
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: (token, user) => {
    localStorage.setItem('token', token);
    const role = user.role;
    let activeRole = role === 'both' ? 'buyer' : role;
    set({ user, token, role, activeRole, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, role: null, activeRole: null, isAuthenticated: false });
  },
  
  switchRole: (newRole) => set({ activeRole: newRole })
}));
