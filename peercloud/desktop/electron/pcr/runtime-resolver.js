const { execSync } = require('child_process');
const path = require('path');

function resolveRuntime(runtimeType) {
  try {
    if (runtimeType === 'python') {
      try {
        return execSync('where python').toString().split('\r\n')[0].trim();
      } catch (e) {
        return execSync('where python3').toString().split('\r\n')[0].trim();
      }
    } else if (runtimeType === 'node') {
      return execSync('where node').toString().split('\r\n')[0].trim();
    } else if (runtimeType === 'binary') {
      return null;
    } else if (runtimeType === 'static') {
      // Find the bundled serve-handler
      try {
        const serveCmd = execSync('where npx').toString().split('\r\n')[0].trim();
        return serveCmd + " serve";
      } catch (e) {
        throw new Error("npx not found for static site serving");
      }
    } else {
      throw new Error(`Unsupported runtime: ${runtimeType}`);
    }
  } catch (err) {
    throw new Error(`Failed to resolve runtime ${runtimeType}: ${err.message}`);
  }
}

module.exports = { resolveRuntime };
