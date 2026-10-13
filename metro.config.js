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

// зачем (TG-CDE4B9A03EB6, 10.10; ПК падал до 0,5 ГБ свободной памяти 4 раза за вечер): Metro сам выбирает число процессов-преобразователей
// (jest-worker) по формуле ceil(ядра * (0.5 + 0.5 * exp(-ядра * 0.07)) - 1) — на 24 логических ядрах это 14 процессов. Каждый грузит Babel и
// кэши AST и за 10–20 минут работы растёт до 300–450 МБ, процессы не пересоздаются: 14 x ~400 МБ + основной ~1–1,5 ГБ = 5–6,5 ГБ (замер живого
// сеанса 10.10: ровно 14 процессов jest-worker у expo start --dev-client). Для локальной разработки хватает 4 (холодный первый бандл чуть дольше,
// тёплый кэш не страдает). Сборочные машины (EAS, CI, стор-релиз) НЕ ограничиваем — там память и ядра выделены под сборку.
// Своё число: PHRASEMAN_METRO_MAX_WORKERS=N (для сборки тоже работает).
const maxWorkersFromEnv = Number.parseInt(process.env.PHRASEMAN_METRO_MAX_WORKERS ?? '', 10);
const isBuildMachine = process.env.EAS_BUILD === 'true' || process.env.CI === 'true' || process.env.EXPO_PUBLIC_STORE_RELEASE === '1';
if (Number.isInteger(maxWorkersFromEnv) && maxWorkersFromEnv > 0) {
  config.maxWorkers = maxWorkersFromEnv;
} else if (!isBuildMachine) {
  config.maxWorkers = 4;
}

// зачем (PM-216 / [HOME-PAINT], координатор 2026-10-03; владелец: «так чтобы все летало»): по умолчанию Expo задаёт
// inlineRequires: false, и ВСЕ статические import исполняются сразу при загрузке модуля. При sync-маршрутах
// expo-router это значит «при запуске выполняется всё приложение». inlineRequires: true переносит require каждой
// связки в место её первого использования — модуль исполняется, когда он реально понадобился. asyncRoutes НЕ включаем
// (для натива он экспериментален). Побочные эффекты при импорте, которые обязаны сработать на старте
// (защита AsyncStorage, прогрев пиков рун/энергии, регистрация сети), закреплены голыми import в index.js —
// голые import transformer не трогает. Аварийный выключатель без отката коммита: PHRASEMAN_NO_INLINE_REQUIRES=1
// (так же сравнивают «до/после» на одной сборке). Теперь инвертировано: включение — PHRASEMAN_INLINE_REQUIRES=1.
// ПО УМОЛЧАНИЮ ВЫКЛЮЧЕНО (решение координатора 2026-10-03): в двух запусках подряд с включённым флагом наблюдался нативный
// сбой Fabric `addViewAt: failed to insert view` (2 из 44 против 0 из 12 без флага), причина не установлена. Включается явно:
// PHRASEMAN_INLINE_REQUIRES=1 (A/B «Дизайна» на слабом профиле, ≥20 запусков на плечо, со счётом FATAL). Ранние import в index.js остаются.
const inlineRequiresEnabled = process.env.PHRASEMAN_INLINE_REQUIRES === '1';
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: inlineRequiresEnabled,
    },
  }),
};

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
  // зачем (TG-CDE4B9A03EB6, 10.10): папки ниже приложение НЕ импортирует (git grep по app/components/constants/modules/hooks/lib/shared/services — 0 импортов),
  // а Metro держал их в карте файлов: functions-admin / functions-content / functions-english-test — по ~6–7 тыс. файлов с собственным node_modules и
  // дубликатами package.json (конфликты haste-имён), android — нативная сборка (~8,8 тыс.), output и dist — выгрузки, остальное — архивы и черновики.
  // Исключение влияет только на локальный обход; EAS клонирует git и эти папки в сборку не попадают (рабочие копии вне git там отсутствуют).
  'android',
  'animation-plans',
  'asset_sources',
  'backups',
  'dist',
  'functions-admin',
  'functions-content',
  'functions-english-test',
  'hardware',
  'lingman-montazher',
  'maestro-results',
  'output',
  'prototypes',
  'showcase',
  'specs',
  'test-results',
  'ux-audit',
  '_archive',
  '_to_delete',
  '.agents',
  '.artifacts',
  '.codex',
  '.dev-screens',
  '.maestro',
  '.motion-mockups',
  '.shots',
  // зачем (TG-441DCCC0ACA3, 10.10): корневая content/ — сценарии курса, пайплайны MASON/LINGMAN/VIRAL,
  // аватар-студия (~2170+ файлов). Приложение её не импортирует (код курса живёт в modules/learning-v2/content/,
  // эта папка сюда не попадает регэкспом по корню). Без исключения Metro держит её в карте файлов и растит память.
  'content',
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

// зачем (координатор 12.10, срочно — инфраструктура съёмки): dev-client запрашивает бандл с `lazy=true`, и каждый import()
// собирается отдельным бандлом на сотни модулей (147 строк «Android Bundled … (745 modules)» в metro_015402.log), а после
// force-stop — заново: сборщик дорастал до 6,5 ГБ за 2–3 минуты и падал, робот Сверки ловил timeout. EXPO_NO_METRO_LAZY=1
// не помогал — параметр ставит сам клиент в URL. Здесь lazy=true → lazy=false в запросах бандла: один полный бандл,
// import() внутри без дозапросов. Правило Expo (виртуальная точка входа) сохраняется — наше применяется после него.
// Только dev-сервер: при EXPO_PUBLIC_STORE_RELEASE=1 не ставится; вернуть ленивую сборку — PHRASEMAN_METRO_KEEP_LAZY=1.
function forceEagerBundleUrl(url) {
  if (typeof url !== 'string' || !/\.(bundle|map)(\?|$)/.test(url.split('#')[0])) return url;
  return url.replace(/([?&])lazy=true(?=&|$)/, '$1lazy=false');
}
if (process.env.EXPO_PUBLIC_STORE_RELEASE !== '1' && process.env.PHRASEMAN_METRO_KEEP_LAZY !== '1') {
  const expoRewriteRequestUrl = config.server?.rewriteRequestUrl;
  let loggedEager = false;
  config.server = {
    ...config.server,
    rewriteRequestUrl: (url) => {
      const base = typeof expoRewriteRequestUrl === 'function' ? expoRewriteRequestUrl(url) : url;
      const next = forceEagerBundleUrl(base);
      if (next !== base && !loggedEager) {
        loggedEager = true;
        console.log('[BUNDLER-EAGER] lazy=true → lazy=false: один полный бандл, без дозапросов import() (PHRASEMAN_METRO_KEEP_LAZY=1 — вернуть)');
      }
      return next;
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
// зачем: D70/D78 — биржа жемчуга удалена, её стор-заглушка больше не нужна.
// зачем (владелец 11.10, «LEARNING V2 ПОПАДАЕТ»): заглушка наград сессии V2 (бросала learning_v2_store_disabled) снята —
// курс входит в стор-сборку, и награда за занятие обязана начисляться настоящим модулем.
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
  // зачем (PM-216 пункт В, 13.10): DevHubSheetGate в сторе возвращает null, но require('./DevHubSheet') сборщик всё равно кладёт в бандл
  // вместе с devToolRegistry и всем, что DEV-хаб тянет (~70 КБ исходника). В стор-сборке — пустой компонент.
  './DevHubSheet',
]);

// зачем (координатор 12.10, ревью безопасности dev-хуков аккаунта): dev-переключатели R1 (аккаунт, VIP/план, промокод/друзья, Карточки, Диалоги, пейвол) импортируются
// статически из боевого кода, поэтому их мёртвый код попадал в стор-бандл. В стор-сборке подменяем модули пустыми заглушками с теми же runtime-экспортами («нет подмены»).
// Ключ — имя файла (импорты бывают './x', '../x', '../app/x'). Сторож паритета экспортов: tests/store_release_dev_state_stubs.test.ts.
const storeReleaseDevStateStubDir = path.join(__dirname, 'store_release_stubs', 'dev_state');
const storeReleaseDevStateStubs = new Map(
  [
    'dev_account_state',
    'dev_vip_override',
    'dev_social_state',
    'dev_cards_state',
    'dev_dialog_state',
    'dev_paywall_state',
    'hub_lifecycle_probe',
    // зачем (координатор 12.10): dev-подмены робота и английского прохода — в стор-сборке заглушки (store_release_stubs_gate)
    'dev_mistakes_demo',
    'dev_friends_demo',
    'dev_ui_lang',
    'dev_save_offer_progress',
    'dev_animations_off',
    // зачем (Макеты 15.10): dev_state?appearance=light|dark — подмена оформления в памяти; в стор-сборке заглушка (ThemeContext импортирует модуль из боевого кода)
    'dev_appearance_override',
    // зачем (Ядро 12.10, energy-modes-006): energy_stop=plus_granted — Plus в памяти на шторке остановки; в стор-сборке заглушка
    'dev_energy_stop_flag',
    // зачем (координатор 12.10): dev_state?robot_no_cloud=1 — робот съёмки не пишет согласия/уведомления; в стор-сборке заглушка
    'dev_robot_no_cloud',
    // зачем (Авторизация 12.10): coinRank/coins/coinupgrade — показ ранга и баланса для съёмки; в стор-сборке заглушка
    'dev_coin_rank',
    // зачем (координатор 13.10): spireTier — лига башни Шпиля для съёмки; в стор-сборке заглушка
    'dev_spire_tier',
    // зачем (PM-216 пункт В, координатор 13.10 «ДА, делай сейчас»): dev-модули, которые первый стор-экспорт нашёл в бандле — закрыты
    // только рантайм-проверкой. Заглушки повторяют их ответ в стор-сборке; dev_practice_runes_seed закрывает devRunesSeed из ссылки.
    // НЕ здесь намеренно: dev_plus_controls (выдача Plus), dev_energy_tools (энергия), dev_fixture_upload_guard (выгрузка синка) —
    // их чистые функции работают на боевом пути; подмена за 3 дня до сборки = риск денег/данных ради ~30 КБ. После R1.
    'dev_ai_consent',
    'dev_as_free_flag',
    'dev_dialog_send',
    'dev_fc_lang_state',
    'dev_hub_bus',
    'dev_overlays_off',
    'dev_practice_runes_seed',
    'dev_robot_display',
    'dev_today_tasks',
    'dev_year_activity',
    'dev_youtube_demo',
  ].map((name) => [name, path.join(storeReleaseDevStateStubDir, `${name}_stub.ts`)]),
);

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

  if (process.env.EXPO_PUBLIC_STORE_RELEASE === '1' && moduleName.startsWith('.')) {
    const devStateStubPath = storeReleaseDevStateStubs.get(path.posix.basename(moduleName));
    if (devStateStubPath) {
      return {
        type: 'sourceFile',
        filePath: devStateStubPath,
      };
    }
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

// зачем (Account V2, решение владельца OD23): dev-вход по почте против эмулятора
// ФИЗИЧЕСКИ отсутствует в сборке без EXPO_PUBLIC_FIREBASE_EMULATOR_HOST (магазинные
// сборки её не задают): маршрут и модуль входа не попадают в граф Metro вовсе,
// а не просто уводят на главную. Сторож: tests/account_v2_producer_6f_v2.test.ts.
const emulatorDevLoginFiles = ['app/dev-emulator-login.tsx', 'app/firebase_emulator_dev_login.ts'];
const emulatorDevLoginBlockList = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST
  ? []
  : emulatorDevLoginFiles.map((file) => new RegExp(`^${escapePathForRegex(path.join(__dirname, file))}$`));

// зачем (Account V2, Пакет 6H, OD17): экран и модули пробы хранилища на iPhone
// ФИЗИЧЕСКИ отсутствуют в любой сборке без EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF=1 —
// его задаёт только EAS-профиль ios-account-v2-proof. Сторож:
// tests/account_v2_ios_proof_6h_v2.test.ts.
const iosAccountProofFiles = [
  'app/dev-account-v2-ios-proof.tsx',
  'runtime-probes/ios-account-sqlcipher/probe.ts',
  'runtime-probes/ios-account-sqlcipher/probe_native.ts',
];
const iosAccountProofBlockList = process.env.EXPO_PUBLIC_ACCOUNT_V2_IOS_PROOF === '1'
  ? []
  : iosAccountProofFiles.map((file) => new RegExp(`^${escapePathForRegex(path.join(__dirname, file))}$`));

// зачем (TG-CDE4B9A03EB6, 10.10): в корне десятки одноразовых папок с изменчивыми именами (.tmp_pkg8k_backup, .arena-test-build-*, .codex-tmp-*,
// _scoped_build_*, _worktree_backups_*) — копии исходников и сборок, ~5 тыс. файлов. Точные имена в список не вписать, поэтому исключаем по префиксу
// имени КОРНЕВОЙ папки. Вложенные папки с такими именами (например в node_modules) не затрагиваются: регэксп привязан к корню проекта.
const ignoredRootPrefixes = ['.arena-', '.tmp', '.codex-tmp', '_scoped_build_', '_worktree_backups_'];

// зачем (TG-77F378A3151A, 11.10): внутри пакетов node_modules лежит вывод Gradle — android/build, android/.cxx, android/.gradle
// (reanimated, worklets, whisper.rn, expo-modules-core и др.): ≈ 13,6 ГБ и ≈ 20 тыс. файлов. JS-бандл их не читает, а в карте файлов
// и списке наблюдения они висели, и каждая сборка Android засыпала бандлер событиями. Исключаем только эти три папки внутри android/.
const gradleOutputInNodeModules = new RegExp(
  `^${escapePathForRegex(path.join(__dirname, 'node_modules'))}[/\\\\].*[/\\\\]android[/\\\\](build|\\.cxx|\\.gradle)[/\\\\].*`,
);

config.resolver.blockList = [
  ...blockList,
  ...emulatorDevLoginBlockList,
  ...iosAccountProofBlockList,
  adminExceptRuntimeAvatars,
  gradleOutputInNodeModules,
  ...ignoredRootFolders.map(
    (folder) => new RegExp(`^${escapePathForRegex(path.join(__dirname, folder))}[/\\\\].*`),
  ),
  ...ignoredRootPrefixes.map(
    (prefix) => new RegExp(`^${escapePathForRegex(path.join(__dirname, prefix))}[^/\\\\]*[/\\\\].*`),
  ),
];

// expo-sqlite imports its web runtime as a static WASM asset. Extend the Expo
// defaults instead of replacing them so images/audio and WASM all work.
// зачем: 'glb' убран 2026-08-24 — 3D-путь аватара закрыт владельцем навсегда
// (2.5D whole-renders), последний GLB и его конвейер удалены вместе с three.
// зачем 'dpk' (координатор 12.10): пакеты фразы дня es/de/it — ресурс-файлы (JSON-текст), а не JS-модули: как модули они
// добавляли +2,27 МБ байт-кода в бандл. Читаются с диска при открытии фразы дня (app/daily_phrase_pack_assets.ts).
config.resolver.assetExts = [...config.resolver.assetExts, 'wasm', 'dpk'];

module.exports = config;
