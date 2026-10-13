// зачем (координатор 12.10, ревью безопасности dev-хуков аккаунта): dev-переключатели R1 импортируются из боевого кода статически, поэтому в стор-сборке сборщик подменяет их
// пустыми заглушками (store_release_stubs/dev_state). Сторож: у каждой заглушки те же runtime-экспорты, что у настоящего модуля (иначе стор-сборка упала бы на недостающем
// экспорте), все значения нейтральны («нет подмены»), а конфиг сборщика подключает заглушки ТОЛЬКО при EXPO_PUBLIC_STORE_RELEASE=1.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const NAMES = ['dev_account_state', 'dev_vip_override', 'dev_social_state', 'dev_cards_state', 'dev_dialog_state', 'dev_paywall_state', 'hub_lifecycle_probe',
  // зачем (координатор 12.10): dev-подмены робота и английского прохода — тоже в списке заглушек сборщика
  'dev_mistakes_demo', 'dev_friends_demo', 'dev_ui_lang', 'dev_save_offer_progress', 'dev_animations_off',
  // зачем (Макеты 15.10): оформление light/dark ссылкой dev_state — только память; в стор-бандле заглушка
  'dev_appearance_override',
  // зачем (координатор 12.10): флаг робота «без облака» для тумблеров Уведомлений/Приватности — в стор-бандле заглушка
  'dev_robot_no_cloud',
  // зачем (Ядро 12.10, energy-modes-006): energy_stop=plus_granted — Plus в памяти на шторке остановки; в стор-бандле заглушка
  'dev_energy_stop_flag',
  // зачем (Авторизация 12.10): показ ранга и баланса монет для съёмки — в стор-бандле заглушка
  'dev_coin_rank', 'dev_spire_tier',
  // зачем (PM-216 пункт В, координатор 13.10): dev-модули, найденные в первом стор-экспорте
  'dev_ai_consent', 'dev_as_free_flag', 'dev_dialog_send', 'dev_fc_lang_state', 'dev_hub_bus', 'dev_overlays_off',
  'dev_practice_runes_seed', 'dev_robot_display', 'dev_today_tasks', 'dev_year_activity', 'dev_youtube_demo'] as const;

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const runtimeExports = (source: string): string[] => {
  const names = new Set<string>();
  for (const match of source.matchAll(/^export (?:async )?(?:const|function) (\w+)/gm)) names.add(match[1]!);
  if (/^export default /m.test(source)) names.add('default');
  return [...names].sort();
};
const stubPath = (name: string) => `store_release_stubs/dev_state/${name}_stub.ts`;

describe('store-release stubs for the R1 dev-state modules', () => {
  it.each(NAMES)('%s: stub exports the same runtime names as the real module', (name) => {
    expect(fs.existsSync(path.join(ROOT, stubPath(name)))).toBe(true);
    expect(runtimeExports(read(stubPath(name)))).toEqual(runtimeExports(read(`app/${name}.ts`)));
  });

  it('stubs import nothing and always answer «no override»', () => {
    for (const name of NAMES) {
      const source = read(stubPath(name));
      expect(source).not.toMatch(/^import /m);
      expect(source).not.toMatch(/console\./); // в стор-бандле нет строк журнала [DEV-STATE]
    }
    /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
    const account = require('../store_release_stubs/dev_state/dev_account_state_stub');
    expect([account.setDevAccountState(), account.isDevAuthNone(), account.getDevSignOutOutcome(true), account.getDevSignInError(), account.isDevUnsavedCardsPrompt(), account.isDevDeleteFail(), account.isDevPlusTransferNotice(), account.getDevGreetName()])
      .toEqual([false, false, null, null, false, false, false, null]);
    const vip = require('../store_release_stubs/dev_state/dev_vip_override_stub');
    expect([vip.setDevVipOverride(), vip.getDevVipOverrideFor('acc'), vip.isDevVipOverrideActive(), vip.setDevPlanOverride(), vip.getDevPlanOverride()]).toEqual([false, null, false, false, null]);
    const social = require('../store_release_stubs/dev_state/dev_social_state_stub');
    expect([social.setDevSocialState(), social.isDevReferralOff(), social.getDevPromoResult(), social.isDevFriendsHeld('x'), social.isDevFriendsFail('x'), social.isDevUnsyncedFriendCode('DEVUNSYNCED'), social.consumeDevFriendEvent(), social.isDevSettingsFail('x')])
      .toEqual([false, false, null, false, false, false, null, false]);
    const cards = require('../store_release_stubs/dev_state/dev_cards_state_stub');
    expect([cards.setDevCardsState(), cards.isDevCardsHeld('x'), cards.isDevCardsFail('x'), cards.getDevSpeechMode(), cards.getDevTrainGate(), cards.devSpeechTranscriptFor('hi')]).toEqual([false, false, false, null, null, null]);
    const dialog = require('../store_release_stubs/dev_state/dev_dialog_state_stub');
    expect([dialog.setDevDialogState(), dialog.getDevDialogFail(), dialog.getDevDialogMood(), dialog.isDevFreeformLoadingHeld(), dialog.isDevDialogEnergyFail(), dialog.isDevDialogLanguageGateHeld()]).toEqual([false, null, null, false, false, false]);
    const paywall = require('../store_release_stubs/dev_state/dev_paywall_state_stub');
    const view = { loading: false };
    expect([paywall.parseDevPaywallState('loading'), paywall.setDevPaywallLinkState('loading'), paywall.getDevPaywallLinkState()]).toEqual([null, false, null]);
    expect(paywall.applyDevPaywallView('loading', view, 'yearly')).toBe(view); // вид окна цен не меняется
    const appearance = require('../store_release_stubs/dev_state/dev_appearance_override_stub');
    expect([appearance.getDevAppearance(), appearance.setDevAppearance('light'), appearance.getDevAppearance()]).toEqual([null, undefined, null]); // подмены оформления нет
    expect(typeof appearance.subscribeDevAppearance()).toBe('function');
    expect([appearance.getDevThemeChoice(), appearance.setDevThemeChoice(), appearance.getDevThemeChoice()]).toEqual([null, undefined, null]); // подмены темы и оттенка нет
    expect(typeof appearance.subscribeDevThemeChoice()).toBe('function');
    const probe = require('../store_release_stubs/dev_state/hub_lifecycle_probe_stub');
    expect(() => { probe.registerHubCacheProbe(); probe.logHubSnapshot(); probe.useHubLifecycle(); probe.noteHubSubscription(); }).not.toThrow();
    // зачем (PM-216 В): devRunesSeed из ссылки не даёт поддельный счётчик; доступ к урокам и снимок окон — как у настоящего модуля в сторе
    const runes = require('../store_release_stubs/dev_state/dev_practice_runes_seed_stub');
    expect([runes.readDevPracticeRunesFakeState('seed123'), runes.DEV_RUNES_SEED_PARAM]).toEqual([null, 'devRunesSeed']);
    const asFree = require('../store_release_stubs/dev_state/dev_as_free_flag_stub');
    const access = { isPremium: true, devMode: false };
    expect([asFree.isDevAsFreeActive(), asFree.applyDevAsFreeToLessonAccess(access, 'lessons')]).toEqual([false, access]);
    expect(asFree.applyDevAsFreeToLessonAccess(access, 'lessons')).toBe(access);
    const overlays = require('../store_release_stubs/dev_state/dev_overlays_off_stub');
    expect([overlays.isDevOverlaysOff(), overlays.getDevOverlaysSnapshot(), overlays.getDevOverlaysSnapshot(), overlays.setDevOverlaysOff(true)]).toEqual([false, '0:0', '0:0', false]);
    expect(typeof overlays.subscribeDevOverlays(() => undefined)).toBe('function');
    const hub = require('../store_release_stubs/dev_state/dev_hub_bus_stub');
    expect(() => hub.requestOpenDevHub('settings_top')).not.toThrow();
    expect(typeof hub.subscribeOpenDevHub(() => undefined)).toBe('function');
    const consent = require('../store_release_stubs/dev_state/dev_ai_consent_stub');
    expect([consent.getDevAiConsentOverride(), consent.getDevAiConsentGranted(), consent.setDevAiConsentOverride('granted')]).toEqual([null, false, false]);
    const youtube = require('../store_release_stubs/dev_state/dev_youtube_demo_stub');
    expect([youtube.getDevYoutubeCatalogReader(), youtube.getDevVideoPhrases('x'), youtube.setDevYoutubeDemo('catalog')]).toEqual([null, null, false]);
    const today = require('../store_release_stubs/dev_state/dev_today_tasks_stub');
    expect([today.getDevTodayTaskSpire(), today.setDevTodayTaskSpire(true)]).toEqual([false, false]);
    const year = require('../store_release_stubs/dev_state/dev_year_activity_stub');
    expect([year.peekDevYearActivityDays(), year.setDevYearActivityDemo(true)]).toEqual([null, false]);
    const robot = require('../store_release_stubs/dev_state/dev_robot_display_stub');
    expect([robot.isDevInboxEmpty(), robot.getDevReminderTime(), robot.setDevInboxEmpty(true)]).toEqual([false, null, false]);
    const fcLang = require('../store_release_stubs/dev_state/dev_fc_lang_state_stub');
    expect([fcLang.getDevOtherLanguageDecks('en'), fcLang.setDevFcLangs(true)]).toEqual([null, false]);
    const send = require('../store_release_stubs/dev_state/dev_dialog_send_stub');
    expect(send.devDialogNextMonthStartMs(Date.UTC(2026, 9, 13))).toBe(Date.UTC(2026, 10, 1));
    /* eslint-enable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  });

  it('the bundler config swaps the modules only in a store build and covers exactly this list', () => {
    const config = read('metro.config.js');
    expect(config).toMatch(/process\.env\.EXPO_PUBLIC_STORE_RELEASE === '1' && moduleName\.startsWith\('\.'\)/);
    expect(config).toMatch(/storeReleaseDevStateStubs\.get\(path\.posix\.basename\(moduleName\)\)/);
    const block = config.match(/const storeReleaseDevStateStubs = new Map\(\s*\[([\s\S]*?)\]\.map/);
    expect(block).not.toBeNull();
    const listed = [...block![1]!.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
    expect(listed).toEqual([...NAMES].sort());
    expect(config).toMatch(/`\$\{name\}_stub\.ts`/);
  });
});
