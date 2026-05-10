import { create } from 'zustand';

export const useDeploymentStore = create((set) => ({
  deployments: [],
  setDeployments: (deployments) => set({ deployments }),
  updateDeployment: (id, updates) => set((state) => ({
    deployments: state.deployments.map(d => d.id === id ? { ...d, ...updates } : d)
  }))
}));
