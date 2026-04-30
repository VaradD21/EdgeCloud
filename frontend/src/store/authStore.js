import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('edgecloud_token') || null,
  user: null,
  setToken: (token) => {
    localStorage.setItem('edgecloud_token', token)
    set({ token })
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem('edgecloud_token')
    set({ token: null, user: null })
  }
}))
