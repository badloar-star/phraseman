const fs = require('fs');
const path = require('path');

const { expo: appJsonExpo } = require('./app.json');

const GLOB_SPECIAL_CHARS = new Set(['?', '+', '.', '^', '$', '(', ')', '{', '}', '|', '[', ']']);
const MINIMAL_OTA_ASSET_PATTERNS = [
  'assets/audio/learning-v2/lesson1/*.m4a',
  'assets/images/avatars/*',
  'assets/images/flashcard_backs/*',
  'assets/images/theo/*',
];
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

module.exports = function buildExpoConfig({ config } = {}) {
  const disableExpoUpdates = process.env.EXPO_PUBLIC_DISABLE_EXPO_UPDATES === '1';
  const minimalOtaAssets = process.env.PHRASEMAN_MINIMAL_OTA_ASSETS === '1';
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
  const speechRecognitionPlugin = [
    'expo-speech-recognition',
    {
      microphonePermission: 'Allow $(PRODUCT_NAME) to listen while you practice pronunciation.',
      speechRecognitionPermission: 'Allow $(PRODUCT_NAME) to recognize your speech for pronunciation practice.',
      androidSpeechServicePackages: ['com.google.android.googlequicksearchbox'],
    },
  ];
  // Speaking mode (premium): on-device speech recognition for pronunciation
  // practice. The plugin injects the mic + speech-recognition usage descriptions
  // at prebuild. Added once, guarded so a plugin already present in app.json wins.
  expoConfig.plugins = [...(expoConfig.plugins || [])];
  for (const pluginName of ['expo-asset', 'expo-audio']) {
    if (!expoConfig.plugins.some((plugin) => (
      Array.isArray(plugin)
        ? plugin[0] === pluginName
        : plugin === pluginName
    ))) {
      expoConfig.plugins.push(pluginName);
    }
  }
  if (!expoConfig.plugins.some((plugin) => (
    Array.isArray(plugin)
      ? plugin[0] === 'expo-speech-recognition'
      : plugin === 'expo-speech-recognition'
  ))) {
    expoConfig.plugins.push(speechRecognitionPlugin);
  }

  if (expoConfig.updates) {
    const assetPatternsToBeBundled = minimalOtaAssets
      ? expandAssetPatternsToExactFiles(__dirname, MINIMAL_OTA_ASSET_PATTERNS)
      : expandAssetPatternsToExactFiles(
          __dirname,
          appJsonExpo.updates?.assetPatternsToBeBundled || [],
        );

    expoConfig.updates.assetPatternsToBeBundled = assetPatternsToBeBundled;
  }

  return expoConfig;
};

module.exports.expandAssetPatternsToExactFiles = expandAssetPatternsToExactFiles;
