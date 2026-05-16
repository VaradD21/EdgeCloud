const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function resolveRuntime(runtimeName) {
  // Try to find on PATH (Windows)
  try {
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    const output = execSync(`${cmd} ${runtimeName}`).toString().trim();
    if (output) {
      return output.split('\n')[0].trim(); // Return first match
    }
  } catch (err) {
    // Command failed, which means not found
  }
  
  return null;
}

module.exports = {
  resolveRuntime
};
