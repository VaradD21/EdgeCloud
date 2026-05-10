const AdmZip = require('adm-zip');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

function loadPackage(peerpkgPath, targetDir) {
  try {
    const zip = new AdmZip(peerpkgPath);
    zip.extractAllTo(targetDir, true);

    const manifestPath = path.join(targetDir, 'peercloud.yaml');
    if (!fs.existsSync(manifestPath)) {
      throw new Error("peercloud.yaml not found in package");
    }

    const fileContents = fs.readFileSync(manifestPath, 'utf8');
    const manifest = yaml.load(fileContents);

    const requiredFields = ['name', 'version', 'runtime', 'entrypoint', 'port', 'cpu_cores', 'ram_mb', 'disk_mb'];
    for (const field of requiredFields) {
      if (!(field in manifest)) {
        throw new Error(`Missing required field in manifest: ${field}`);
      }
    }

    const validRuntimes = ['python', 'node', 'binary', 'static'];
    if (!validRuntimes.includes(manifest.runtime)) {
      throw new Error(`Invalid runtime: ${manifest.runtime}. Must be one of: ${validRuntimes.join(', ')}`);
    }

    return manifest;
  } catch (err) {
    throw new Error(`Failed to load package: ${err.message}`);
  }
}

module.exports = { loadPackage };
