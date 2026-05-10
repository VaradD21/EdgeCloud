import { create } from 'zustand';

export const useWorkloadStore = create((set) => ({
  workloads: [],
  setWorkloads: (workloads) => set({ workloads }),
  updateWorkload: (update) => set((state) => ({
    workloads: state.workloads.map(w => w.id === update.id ? { ...w, ...update } : w)
  }))
}));
