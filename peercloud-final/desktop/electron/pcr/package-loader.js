const tar = require('tar');
const path = require('path');
const fs = require('fs');

async function extractPackage(archivePath, extractDest) {
  if (!fs.existsSync(extractDest)) {
    fs.mkdirSync(extractDest, { recursive: true });
  }
  
  await tar.x({
    file: archivePath,
    cwd: extractDest
  });
  
  return true;
}

module.exports = {
  extractPackage
};
