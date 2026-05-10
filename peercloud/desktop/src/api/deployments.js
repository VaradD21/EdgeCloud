export const createDeployment = (token, listingId, peerpkgPath, envVars) => window.peercloud.createDeployment(token, listingId, peerpkgPath, envVars);
export const getMyDeployments = (token) => window.peercloud.getMyDeployments(token);
export const getDeploymentLogs = (token, id) => window.peercloud.getDeploymentLogs(token, id);
export const getDeploymentStats = (token, id) => window.peercloud.getDeploymentStats(token, id);
export const stopDeployment = (token, id) => window.peercloud.stopDeployment(token, id);
export const onDeploymentLog = (callback) => window.peercloud.onDeploymentLog(callback);
