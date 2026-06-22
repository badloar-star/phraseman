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
  '.codex-tmp',
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
  'lingman-scenarist-pipeline',
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

// Старый обход бага expo-dev-client, который НЕ умел парсить multipart-ответ Metro:
// для .bundle-запросов вырезался `multipart/mixed` из Accept, чтобы Metro отдавал
// обычный (не multipart) бандл. ПОБОЧКА: `multipart/mixed` — это канал доставки
// дельт Fast Refresh, поэтому вырезание ГЛУШИТ Fast Refresh (правки не применяются
// на лету, нужен ручной reload). На expo-dev-client 6.x (SDK 54 / RN 0.81) multipart
// уже поддерживается, обход не нужен — поэтому по умолчанию он ВЫКЛЮЧЕН.
// Включить обратно (если на конкретном устройстве multipart всё же ломает бандл):
// EXPO_METRO_STRIP_MULTIPART=1.
const stripMultipartForBundles = process.env.EXPO_METRO_STRIP_MULTIPART === '1';
const defaultEnhanceMiddleware = config.server?.enhanceMiddleware;
if (stripMultipartForBundles) {
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
}

const defaultResolveRequest = config.resolver.resolveRequest;
const routerContextPath = path.join(__dirname, 'router.ctx.js');
const firebaseFunctionsWebShimPath = path.join(__dirname, 'web_shims', 'firebase-functions-web-shim.js');
const storeReleaseDevModuleStubPath = path.join(__dirname, 'app', '_store_release_dev_module_stub.tsx');
const storeReleaseVipSurveyDevAuthStubPath = path.join(
  __dirname,
  'store_release_stubs',
  'vip_survey_dev_auth_stub.ts',
);
const storeReleaseDevModules = new Set([
  './_admin_settings_testers',
  './_admin_intro_preview',
  './_admin_review_test',
  './_admin_premium_delivery_test',
  // DEV/QA-лаборатории: их роут-стабы делают `if (ENABLE_DEV_TOOLS) require('./_admin_*')`.
  // ENABLE_DEV_TOOLS — РАНТАЙМ-флаг (process.env), Metro его не сворачивает в dead code,
  // поэтому без явной подмены здесь реальный код лабы физически уезжает в стор-бандл
  // (подтверждено source-map'ом prod-сборки). Держим список синхронным со всеми
  // `_admin_*`-роутами под `if (ENABLE_DEV_TOOLS)`.
  './_admin_celebration_lab',
  './_admin_compass_lab',
  './_admin_speaking_lab',
  './_admin_referral_lab',
  './_pos_analytics_audit',
  './flashcards_market_dev',
]);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-router/_ctx') {
    return {
      type: 'sourceFile',
      filePath: routerContextPath,
    };
  }

  if (
    platform === 'web' &&
    (moduleName === '@react-native-firebase/functions' ||
      moduleName.startsWith('@react-native-firebase/functions/'))
  ) {
    return {
      type: 'sourceFile',
      filePath: firebaseFunctionsWebShimPath,
    };
  }

  if (
    process.env.EXPO_PUBLIC_STORE_RELEASE === '1' &&
    moduleName === './vip_survey_dev_auth'
  ) {
    return {
      type: 'sourceFile',
      filePath: storeReleaseVipSurveyDevAuthStubPath,
    };
  }

  if (
    process.env.EXPO_PUBLIC_STORE_RELEASE === '1' &&
    storeReleaseDevModules.has(moduleName)
  ) {
    return {
      type: 'sourceFile',
      filePath: storeReleaseDevModuleStubPath,
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
