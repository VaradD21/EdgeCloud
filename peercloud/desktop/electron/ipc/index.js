const { registerAuthIpc } = require('./auth');
const { registerHardwareIpc } = require('./hardware');
const { registerNodeRegistrationIpc } = require('./node-registration');
const { registerResourceConfigIpc } = require('./resource-config');
const { registerWorkloadIpc } = require('./workload-runner');
const { registerMarketplaceIpc } = require('./marketplace');
const { registerDeployIpc } = require('./deploy');
const { registerDeploymentMonitorIpc } = require('./deployment-monitor');

function registerAllIpc(mainWindow) {
  registerAuthIpc();
  registerHardwareIpc();
  registerNodeRegistrationIpc();
  registerResourceConfigIpc();
  registerWorkloadIpc(mainWindow);
  registerMarketplaceIpc();
  registerDeployIpc();
  registerDeploymentMonitorIpc();
}

module.exports = { registerAllIpc };
