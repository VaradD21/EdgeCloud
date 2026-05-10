export const getRunningWorkloads = () => window.peercloud.getRunningWorkloads();
export const stopWorkload = (id) => window.peercloud.stopWorkload(id);
export const onWorkloadUpdate = (callback) => window.peercloud.onWorkloadUpdate(callback);
