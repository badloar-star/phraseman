// @see https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const existingBlockList = config.resolver.blockList;
const blockList = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
    ? [existingBlockList]
    : [];

const escapePathForRegex = (filePath) =>
  filePath
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[/\\]/g, '[/\\\\]');

const ignoredRootFolders = [
  '.claude',
  '.claude-flow',
  '.cursor',
  '.firebase',
  '.git',
  '.github',
  '.hive-mind',
  '.idea',
  '.obsidian',
  '.planning',
  '.vscode',
  '.well-known',
  'admin',
  'builds',
  'docs',
  'duel',
  'exports',
  'functions',
  'invite',
  'knowly-www',
  'legal',
  'maestro',
  'mocks',
  'qa-artifacts',
  'review',
  'scripts',
  'SSIU',
  'subscription-recovery',
  'tests',
  'tmp',
  'tools',
];

const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const enhancedMiddleware = defaultEnhanceMiddleware
      ? defaultEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      if (req.url?.includes('.bundle')) {
        const accept = req.headers.accept;
        if (typeof accept === 'string' && accept.includes('multipart/mixed')) {
          const nextAccept = accept
            .split(',')
            .map((value) => value.trim())
            .filter((value) => value !== 'multipart/mixed')
            .join(', ');

          req.headers.accept = nextAccept || '*/*';
        }
      }

      return enhancedMiddleware(req, res, next);
    };
  },
};

const defaultResolveRequest = config.resolver.resolveRequest;
const routerContextPath = path.join(__dirname, 'router.ctx.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/_ctx') {
    return {
      type: 'sourceFile',
      filePath: routerContextPath,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.blockList = [
  ...blockList,
  ...ignoredRootFolders.map(
    (folder) => new RegExp(`^${escapePathForRegex(path.join(__dirname, folder))}[/\\\\].*`),
  ),
];

module.exports = config;
