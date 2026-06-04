const fs = require('fs');
const path = require('path');

const { expo: appJsonExpo } = require('./app.json');

const GLOB_SPECIAL_CHARS = new Set(['?', '+', '.', '^', '$', '(', ')', '{', '}', '|', '[', ']']);
const MINIMAL_OTA_ASSET_PATTERNS = [
  'assets/images/avatars/*',
  'assets/images/flashcard_backs/*',
  'assets/images/quizzes/level_cards/*',
  'assets/images/quizzes/level_logos/*',
  'assets/images/quizzes/theme_cards/*',
  'assets/images/quizzes/theme_logos/*',
];
const STORE_RELEASE_DEV_ONLY_QUIZ_THEME_SLUGS = new Set([
  'at-the-doctor',
  'body-and-health',
  'shopping-and-money',
]);

function toPosixPath(value) {
  return String(value).replace(/\\/g, '/');
}

function globToRegExp(glob) {
  const normalized = toPosixPath(glob);
  let pattern = '^';

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (char === '*') {
      if (normalized[index + 1] === '*') {
        if (normalized[index + 2] === '/') {
          pattern += '(?:.*/)?';
          index += 2;
        } else {
          pattern += '.*';
          index += 1;
        }
      } else {
        pattern += '[^/]*';
      }
      continue;
    }

    pattern += GLOB_SPECIAL_CHARS.has(char) ? `\\${char}` : char;
  }

  return new RegExp(`${pattern}$`);
}

function firstGlobIndex(pattern) {
  const indexes = ['*', '?', '[', '{']
    .map((char) => pattern.indexOf(char))
    .filter((index) => index >= 0);

  return indexes.length ? Math.min(...indexes) : -1;
}

function globBaseDir(projectRoot, pattern) {
  const normalized = toPosixPath(pattern);
  const globIndex = firstGlobIndex(normalized);
  if (globIndex < 0) {
    return path.dirname(path.join(projectRoot, normalized));
  }

  const slashIndex = normalized.lastIndexOf('/', globIndex);
  const base = slashIndex >= 0 ? normalized.slice(0, slashIndex) : '.';
  return path.join(projectRoot, base);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }

  return out;
}

function expandAssetPatternsToExactFiles(projectRoot, patterns) {
  const exactFiles = new Set();

  for (const pattern of patterns || []) {
    const normalizedPattern = toPosixPath(pattern);
    const hasGlob = firstGlobIndex(normalizedPattern) >= 0;

    if (!hasGlob) {
      exactFiles.add(normalizedPattern);
      continue;
    }

    const matcher = globToRegExp(normalizedPattern);
    const baseDir = globBaseDir(projectRoot, normalizedPattern);
    const matches = walkFiles(baseDir)
      .map((filePath) => toPosixPath(path.relative(projectRoot, filePath)))
      .filter((relativePath) => matcher.test(relativePath));

    if (matches.length === 0) {
      exactFiles.add(normalizedPattern);
      continue;
    }

    for (const match of matches) {
      exactFiles.add(match);
    }
  }

  return [...exactFiles].sort();
}

function filterStoreReleaseAssets(assetPaths) {
  return assetPaths.filter((assetPath) => {
    const match = assetPath.match(
      /^assets\/images\/quizzes\/theme_(?:cards|logos)\/quiz-theme-(at-the-doctor|body-and-health|shopping-and-money)-/,
    );

    return !match || !STORE_RELEASE_DEV_ONLY_QUIZ_THEME_SLUGS.has(match[1]);
  });
}

module.exports = function buildExpoConfig({ config } = {}) {
  const disableExpoUpdates = process.env.EXPO_PUBLIC_DISABLE_EXPO_UPDATES === '1';
  const minimalOtaAssets = process.env.PHRASEMAN_MINIMAL_OTA_ASSETS === '1';
  const storeRelease = process.env.EXPO_PUBLIC_STORE_RELEASE === '1';
  const updates = appJsonExpo.updates
    ? {
        ...appJsonExpo.updates,
        enabled: disableExpoUpdates ? false : appJsonExpo.updates.enabled !== false,
      }
    : disableExpoUpdates
      ? { enabled: false }
      : undefined;
  const expoConfig = {
    ...config,
    ...appJsonExpo,
    ...(updates ? { updates } : {}),
  };
  expoConfig.plugins = [...new Set([...(expoConfig.plugins || []), 'expo-audio'])];

  if (expoConfig.updates) {
    const assetPatternsToBeBundled = minimalOtaAssets
      ? expandAssetPatternsToExactFiles(__dirname, MINIMAL_OTA_ASSET_PATTERNS)
      : expandAssetPatternsToExactFiles(
          __dirname,
          appJsonExpo.updates?.assetPatternsToBeBundled || [],
        );

    expoConfig.updates.assetPatternsToBeBundled = storeRelease
      ? filterStoreReleaseAssets(assetPatternsToBeBundled)
      : assetPatternsToBeBundled;
  }

  return expoConfig;
};

module.exports.expandAssetPatternsToExactFiles = expandAssetPatternsToExactFiles;
module.exports.filterStoreReleaseAssets = filterStoreReleaseAssets;
