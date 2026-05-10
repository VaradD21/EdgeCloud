import { create } from 'zustand';

export const useHostStore = create((set) => ({
  nodeId: null,
  nodeSecret: null,
  resourceConfig: null,
  earnings: 0,
  
  setNodeInfo: (nodeId, nodeSecret) => set({ nodeId, nodeSecret }),
  setResourceConfig: (config) => set({ resourceConfig: config }),
  setEarnings: (earnings) => set({ earnings })
}));
