export const getHardwareInfo = () => window.peercloud.getHardwareInfo();
export const registerNode = (token, displayName, cpu, ram, disk) => window.peercloud.registerNode(token, displayName, cpu, ram, disk);
export const saveResourceConfig = (config) => window.peercloud.saveResourceConfig(config);
export const getResourceConfig = () => window.peercloud.getResourceConfig();
export const getEarnings = (token) => window.peercloud.getEarnings(token);
