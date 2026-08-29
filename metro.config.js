// @see https://docs.expo.dev/guides/customizing-metro/
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// зачем: 2026-07-26 сборка встала с «Unable to resolve module expo-router/entry ...
// could not be found within the project or in these directories: node_modules» — при том
// что файл на месте, Node его резолвит, blockList не мешает и ошибка повторялась даже на
// чистом конфиге Expo. Настоящая причина — Watchman: он аварийно падал на старте
// (`bind(AppData/Local/watchman/sock): Invalid argument` → `Failed to initialize unix
// domain listener` → `Exiting from service with res=false`) из-за мёртвого sock-файла с
// битыми правами. Metro запрашивал у него файловую карту, получал ПУСТОЙ обход и потому
// «не видел» node_modules — не резолвился даже прямой относительный путь к файлу.
// Отключаем Watchman: Metro сканирует файлы своим node-крawler'ом и больше не зависит от
// сбоев внешнего демона. Платой является чуть более долгий первый старт бандлера.
// 2026-08-12: отключение Watchman нужно ТОЛЬКО на Windows (там из-за мёртвого
// sock-файла демон падал и Metro получал пустой обход). На macOS/Linux Watchman —
// единственный надёжный источник событий об изменении файлов: без него Metro
// крауллит дерево сам и на проекте такого размера пропускает правки, поэтому
// Fast Refresh на телефоне не срабатывает и приходится жать reload руками.
// 2026-08-16: Watchman на Windows ЧИНЁН и снова включён — владелец жаловался,
// что правки не доезжают на iPhone без ручного reload. Причина была ровно в
// этом: без Watchman node-крawler на дереве такого размера пропускает события,
// и Fast Refresh молчит. Демон проверен (watch-project отвечает, видит дерево),
// а .watchmanconfig ограничивает обход. Аварийный выключатель на случай, если
// мёртвый sock вернётся: PHRASEMAN_NO_WATCHMAN=1 в окружении.
config.resolver.useWatchman = process.env.PHRASEMAN_NO_WATCHMAN !== '1';

const existingBlockList = config.resolver.blockList;
const blockList = Array.isArray(existingBlockList)
  ? existingBlockList
  : existingBlockList
    ? [existingBlockList]
    : [];

const escapePathForRegex = (filePath) =>
  filePath
    .replace(/\\/g, '/')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\//g, '[/\\\\]');

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
  '.worktrees',
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

// Avatar100 finals are runtime assets even though their shared source of truth
// lives beside the admin preview. Keep every other admin surface out of Metro's
// file map, but allow the two ancestor directories and the avatar subtree so
// literal require() calls in constants/avatar100_assets.ts can resolve.
const adminRoot = escapePathForRegex(path.join(__dirname, 'admin'));
const adminExceptRuntimeAvatars = new RegExp(
  `^${adminRoot}[/\\\\](?!v2(?:[/\\\\]avatars(?:[/\\\\]|$)|$)).*`,
);

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
  './_admin_speaking_lab',
  './_admin_referral_lab',
  './_admin_sound_lab',
  './_pos_analytics_audit',
  './flashcards_market_dev',
  // зачем 2026-08-24 (аудит бандла): витрина движения (_motion_showcase +
  // components/dev/motion_showcase, 21 файл / ~264 КБ) и SQLCipher-smoke
  // попадали в стор-бандл через роутер-контекст, минуя __DEV__-гейт —
  // тот же класс дыры, что у _admin_*-лаб. Исключены в паре с router.ctx.js.
  './_motion_showcase',
  './_phone_state_sqlcipher_smoke',
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
  adminExceptRuntimeAvatars,
  ...ignoredRootFolders.map(
    (folder) => new RegExp(`^${escapePathForRegex(path.join(__dirname, folder))}[/\\\\].*`),
  ),
];

// expo-sqlite imports its web runtime as a static WASM asset. Extend the Expo
// defaults instead of replacing them so images/audio and WASM all work.
// зачем: 'glb' убран 2026-08-24 — 3D-путь аватара закрыт владельцем навсегда
// (2.5D whole-renders), последний GLB и его конвейер удалены вместе с three.
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm'];

module.exports = config;
