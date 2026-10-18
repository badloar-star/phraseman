import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import vm from 'node:vm';

const storage = {
  getItem: jest.fn<Promise<string | null>, [string]>(),
  setItem: jest.fn<Promise<void>, [string, string]>(),
};
jest.mock('@react-native-async-storage/async-storage', () => storage);
jest.mock('../app/app_snapshot_store', () => ({ patchAppSnapshot: () => {} }));
jest.mock('../app/debug-logger', () => ({ reportSwallowed: jest.fn(), swallowError: jest.fn(() => jest.fn()), DebugLogger: { error: () => {} } }));

const rootSource = fs.readFileSync(path.resolve(__dirname, '../app/_layout.tsx'), 'utf8');
const snapshotSource = ts.createSourceFile('bootstrap.ts', fs.readFileSync(path.resolve(__dirname, '../app/app_snapshot_bootstrap.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const primeNode = snapshotSource.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'primeAppSnapshotFromStorage')!;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => { resolve = yes; });
  return { promise, resolve };
}

describe('two actual startup settings consumers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    storage.getItem.mockResolvedValue('{"speechRate":1.3,"voiceOut":false}');
  });

  function startBoot() {
    const start = rootSource.indexOf('closeStartupSettingsReadScope?.();', rootSource.indexOf('// Tiny local hydration budget'));
    const end = rootSource.indexOf("bootMark('startupLocalHydration RACE START", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const store = require('../app/user_settings_store') as typeof import('../app/user_settings_store');
    const policy = require('../lib/startup_settings_read_scope') as typeof import('../lib/startup_settings_read_scope');
    const progress = deferred<null>();
    const account = { stableId: 'A', generation: 1 };
    let generation = 1;
    let scope!: ReturnType<typeof policy.createSettingsBootReadScope>;
    const calls: string[] = [];
    const primed: Array<Record<string, unknown>> = [];
    const instantTasks = [
      'primeSurveyOfferCacheFromStorage', 'primeScreenSnapshotsFromStorage',
      'hydrateDailyPhrasePeekFromStorage', 'hydrateYoutubeChannelPreference',
      'hydrateStatsCacheFromStorage', 'primeRemoteConfigCacheFromStorage',
      'hydrateHapticsTapFromStorage', 'hydrateAnalyticsConsentFromStorage',
      'hydrateAiExplainConsentFromStorage', 'hydrateAiDialogConsentFromStorage',
      // зачем (10.10): согласие на голосовой ИИ снято снимком 2.0 (efe19ae9d) — на старте его больше не читают.
      'hydrateAgeGateFromStorage',
    ];
    const context: Record<string, unknown> = {
      effectDisposed: false, closeStartupSettingsReadScope: null, studyTarget: 'en',
      captureAccountGeneration: () => account,
      isCurrentAccountGeneration: (token: typeof account) => token.generation === generation,
      createSettingsBootReadScope: (isCurrent: () => boolean) => {
        scope = policy.createSettingsBootReadScope(isCurrent);
        return scope;
      },
      hydrateUserSettingsFromStorage: store.hydrateUserSettingsFromStorage,
      hydratePersonalProgress: () => { calls.push('primeAppSnapshotFromStorage'); return progress.promise; },
      migrateLegacyVipSnapshotOnce: async () => false,
      readVipSnapshotForGeneration: async () => null,
      lastOpenedLessonKey: () => 'last_lesson',
      BOOT_PROFILE_KEYS: [], BOOT_PROGRESS_KEYS: [], CUSTOMIZATION_STORAGE_KEYS: [], BOOT_SETTINGS_KEYS: [],
      BOOT_LANG_KEY: 'lang', BOOT_STUDY_TARGET_KEY: 'target', BOOT_LEAGUE_STATE_KEY: 'league', REFERRAL_STATE_STORAGE_KEY: 'referral',
      AsyncStorage: { multiGet: async () => [] },
      primeFriendsSnapshot: async () => null,
      readAvatarDNAState: async () => null,
      require: () => ({ peekStoredLevelSpinStarsForBoot: async () => null }),
      mapPairs: () => new Map(), writePeekAppLang: () => {}, writePeekStudyTargetRaw: () => {},
      rememberLeagueStateSnapshot: () => {}, sanitizeLeagueState: () => null,
      hydrateReferralStateFromRaw: () => {}, buildProfileSnapshot: () => ({ level: 1 }),
      primeShardsBalanceMemoryFromBoot: () => {}, readInt: () => 0, primeEnergyPeekFromBoot: async () => {},
      buildProgressSnapshot: () => ({}), buildCustomizationSnapshot: () => ({}),
      buildSettingsSnapshot: () => store.getUserSettingsSnapshot(),
      patchAppSnapshot: (make: (current: object) => Record<string, unknown>) => primed.push(make({})),
      // зачем (10.10): PM-229 заменил немые catch в старте на noteSwallowedAs/noteSwallowedHandler — песочнице
      // нужны те же имена, иначе код падает ReferenceError ещё до проверки.
      noteSwallowedAs: (_tag: string, fallback: unknown) => () => fallback,
      noteSwallowedHandler: (_tag: string) => () => undefined,
      // зачем (11.10): снимок старта пишет диагностику [BOOT-SNAPSHOT] через console — без него песочница падала
      // ReferenceError до второго чтения настроек, и сторож видел «чтение одно» вместо реального поведения.
      console: { log: () => undefined, warn: () => undefined, error: () => undefined },
      // зачем (11.10): ускорение старта 05.10 (2680e8266/82cfbc031) добавило в снимок чтение прогресса уроков в том же
      // multiGet и досылку рун — без этих имён песочница падала ReferenceError, и сторож показывал «нет второго чтения»
      // вместо реального поведения. Логика чтения настроек здесь настоящая, заглушены только посторонние части.
      BOOT_LESSON_COUNT: 0,
      lessonProgressKey: (lesson: number) => `lesson${lesson}_progress`,
      lastOpenedLessonCorrectFromBoot: () => null,
      storageStudyTarget: (target: unknown) => target ?? 'en',
      mergeBootRunesIntoProgress: (progress: unknown) => progress,
    };
    instantTasks.forEach((name) => { context[name] = async () => { calls.push(name); }; });
    // Execute the real prime function and real root hydration block. Only unrelated
    // providers/native I/O are replaced; settings normalization/policy are real.
    const code = `${primeNode.getText(snapshotSource).replace(/^export /, '')}\n${rootSource.slice(start, end)}\nstartupLocalHydration;`;
    const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText;
    const done = vm.runInNewContext(js, context) as Promise<unknown>;
    return { done, progress, scope, calls, primed, store, context, changeAccount: () => { generation += 1; } };
  }

  test('root settings are ready without waiting for progress; delayed snapshot reuses them', async () => {
    const boot = startBoot();
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    expect(boot.store.getUserSettingsSnapshot().speechRate).toBe(1.3);
    expect(boot.scope.peek()).not.toBeNull();
    // зачем (координатор 18.10, разбор холодного старта (а)): снапшоты экранов, кэш статистики серии и выбор YouTube-канала
    // ушли из стартовой пачки на idle после кадра Главной — в пачке 8 мгновенных задач + снапшот приложения.
    expect(boot.calls).toHaveLength(9);
    expect(boot.calls).not.toEqual(expect.arrayContaining(['primeScreenSnapshotsFromStorage']));
    expect(boot.calls).not.toEqual(expect.arrayContaining(['hydrateStatsCacheFromStorage']));
    expect(boot.calls).not.toEqual(expect.arrayContaining(['hydrateYoutubeChannelPreference']));
    boot.progress.resolve(null);
    await boot.done;
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    expect(boot.primed[0].settings).toMatchObject({ speechRate: 1.3, voiceOut: false });
    expect(boot.scope.peek()).toBeNull(); // Full settlement closes the scope.
  });

  test('a restore between the two consumers forces a fresh second native read', async () => {
    const boot = startBoot();
    await Promise.resolve();
    const finish = require('../lib/startup_settings_read_scope').beginSettingsStorageMutation();
    storage.getItem.mockResolvedValue('{"speechRate":1.1}');
    finish();
    boot.progress.resolve(null);
    await boot.done;
    expect(storage.getItem).toHaveBeenCalledTimes(2);
    expect(boot.primed[0].settings).toMatchObject({ speechRate: 1.1 });
  });

  test('account change still aborts the delayed snapshot publication', async () => {
    const boot = startBoot();
    await Promise.resolve();
    boot.changeAccount();
    expect(boot.scope.peek()).toBeNull();
    boot.progress.resolve(null);
    await boot.done;
    expect(boot.primed).toHaveLength(0);
  });

  test('effect disposal makes the scope unusable before pending hydration finishes', async () => {
    const boot = startBoot();
    await Promise.resolve();
    boot.context.effectDisposed = true;
    (boot.context.closeStartupSettingsReadScope as () => void)();
    expect(boot.scope.peek()).toBeNull();
    boot.progress.resolve(null);
    await boot.done;
    expect(storage.getItem).toHaveBeenCalledTimes(2);
  });

  test('retains the race budget and closes at actual settlement, with disposal cleanup', () => {
    expect(rootSource).toContain('new Promise<void>((resolve) => setTimeout(resolve, 350))');
    expect(rootSource).toContain('void startupLocalHydration.then(');
    // зачем (перепрогон 12.10): перед вызовом появился поясняющий комментарий (ревью Opus) — окно 250 символов стало мало;
    // проверяем всю функцию очистки, до её закрывающей скобки.
    const cleanupStart = rootSource.indexOf('effectDisposed = true;');
    const cleanup = rootSource.slice(cleanupStart, rootSource.indexOf('};', cleanupStart));
    expect(cleanup).toContain('closeStartupSettingsReadScope?.();');
    expect(primeNode.getText(snapshotSource)).toContain('hydrateUserSettingsFromStorage(settingsBootReadScope)');
  });
});
