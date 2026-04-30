const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Nested workspace (Next.js / own package.json) lives under the same repo root.
// Blocking it avoids rare Metro resolution/watcher issues on Windows and speeds resolution.
const blockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(blockList)
  ? [...blockList, /subscription-recovery[\\/].*/]
  : [/subscription-recovery[\\/].*/];

module.exports = config;
