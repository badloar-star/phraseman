import fs from 'fs';
import path from 'path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const modal = fs.readFileSync(path.join(process.cwd(), 'components', 'WelcomeGiftModal.tsx'), 'utf8');
const flags = fs.readFileSync(path.join(process.cwd(), 'app', 'remote_flags.ts'), 'utf8');
const legacy = fs.readFileSync(path.join(process.cwd(), 'admin', 'legacy.html'), 'utf8');
const host = fs.readFileSync(path.join(process.cwd(), 'components', 'OnboardingWelcomeHost.tsx'), 'utf8');
const rootLayout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
const welcomeState = fs.readFileSync(path.join(process.cwd(), 'app', 'onboarding_welcome_state.ts'), 'utf8');
const events = fs.readFileSync(path.join(process.cwd(), 'app', 'events.ts'), 'utf8');

// зачем: владелец (2026-07-26) — «Пропустить» на каждом экране кроме оплаты и
// приветствие после онбординга. Обе фичи обязаны оставаться
// выключаемыми из админки без релиза, а «Пропустить» — не появляться на пейволе,
// иначе это прямой удар по конверсии.
describe('Onboarding skip link', () => {
  // 2026-08-17: privacy и notifications тоже без «Пропустить» — у них уже есть
  // своя серая ссылка («Позже» / «Не сейчас»), вторая подряд читалась бы дублем.
  // 2026-08-17b: trialReminder тоже без «Пропустить»: он стоит после «name»,
  // поэтому общий переход на обязательный шаг выглядел бы как шаг НАЗАД.
  it('is hidden on the paywall, the mandatory step and screens with their own grey exit', () => {
    expect(onboarding).toContain("const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name', 'privacy', 'notifications', 'trialReminder']");
    expect(onboarding).toContain('if (!skip || SKIP_HIDDEN_STEPS.includes(step)) return null');
  });

  it('jumps straight to the mandatory consent step and guards double taps', () => {
    expect(onboarding).toContain('go(MANDATORY_ONBOARDING_STEP)');
    // На «name» и ПОСЛЕ него (trialReminder/пейвол) пропуск — no-op: иначе он вёл бы назад.
    expect(onboarding).toContain('if (skippedRef.current || enabledOrder.indexOf(step) >= enabledOrder.indexOf(MANDATORY_ONBOARDING_STEP)) return;');
  });

  it('is killable from the admin without a release', () => {
    expect(flags).toContain("| 'onboarding_skip_enabled'");
    expect(flags).toContain('onboarding_skip_enabled: true');
    expect(onboarding).toContain("getRemoteBool('onboarding_skip_enabled')");
    // null в контексте = ссылки нет вовсе, а не «есть, но не работает».
    expect(onboarding).toContain('skipEnabled ? skipOnboarding : null');
  });

  it('records the skip once so the admin can show a percentage', () => {
    expect(onboarding).toContain("trackActivity('onboarding_skip'");
    expect(onboarding).toContain('writeToFirestore: true');
  });
});

// зачем: владелец (2026-08-26) — шторка «Спасибо за установку» заменена
// церемонией WelcomeGiftModal со стартовым подарком (+100 жемчужин, +300 рун).
// Контракт сторожит: показ над Главной через арбитр, одноразовость, рубильник
// из админки, и главное — начисление стартует в момент решения показать
// приветствие, а НЕ по CTA модалки (класс бага «награду показали, но не начислили»).
describe('Welcome gift ceremony after onboarding', () => {
  it('is a celebration-family modal, not a bottom sheet', () => {
    expect(modal).toContain('useRewardImpactHybrid');
    expect(modal).toContain("rarity: 'legendary'");
    expect(modal).not.toContain('ReferralSheetShell');
    expect(modal).not.toContain('HybridSheetShell');
  });

  // зачем: владелец (2026-07-27) — «модал должен быть не на этом экране, а когда
  // открылся экран главной». Онбординг больше НЕ рисует приветствие и не держит
  // onDone: он ставит одноразовый флаг и сразу отпускает управление.
  it('never renders the ceremony itself — onboarding only raises a one-shot flag', () => {
    expect(onboarding).not.toContain('WelcomeGiftModal');
    expect(onboarding).not.toContain('welcomeSheetVisible');
    expect(onboarding).toContain('await markOnboardingWelcomePending();');
  });

  it('releases the app immediately, on both flag branches', () => {
    // onDone() стоит ПОСЛЕ if-а, а не внутри else — управление отдаётся всегда.
    expect(onboarding).toMatch(/if \(welcomeSheetEnabled\) \{[\s\S]*?\}\s*onDone\(\);/);
  });

  it('is raised over Home through the arbiter, not with a private visible', () => {
    expect(rootLayout).toContain('<OnboardingWelcomeHost />');
    // Первый в OVERLAY_PRIORITY — новичок видит приветствие раньше наград/update.
    expect(host).toContain("useOverlayVisible('onboardingWelcome', wantShow)");
  });

  it('starts crediting when it decides to show — before and independent of the CTA', () => {
    // Начисление НЕ живёт в модалке и не привязано к её кнопке: хост зовёт
    // ensureWelcomeGiftGranted до setWantShow, размонтирование ничего не теряет.
    expect(host).toMatch(/void ensureWelcomeGiftGranted\(\);\s*\n\s*setWantShow\(true\);/);
    expect(modal).not.toContain('ensureWelcomeGiftGranted');
    // Ветка «показывать нечего» всё равно гарантирует выдачу текущему аккаунту
    // (инцидент 2026-08-26: деньги полностью отвязаны от модалки).
    expect(host).toMatch(/if \(!pending\) \{[\s\S]*?void ensureWelcomeGiftGranted\(\);[\s\S]*?return;/);
  });

  it('shows once: the pending flag is cleared when the ceremony closes', () => {
    expect(host).toContain('clearOnboardingWelcomePending()');
  });

  it('kill switch from the admin disables both the ceremony and the gift', () => {
    expect(flags).toContain("| 'onboarding_welcome_sheet_enabled'");
    expect(flags).toContain('onboarding_welcome_sheet_enabled: true');
    expect(onboarding).toContain('if (welcomeSheetEnabled) {');
    // Рубильник проверяется в хосте ДО начала выдачи: выключен → ни модалки,
    // ни beginWelcomeGiftGrant, флаг снимается.
    expect(host).toMatch(/if \(!getRemoteBool\('onboarding_welcome_sheet_enabled'\)\) \{[\s\S]*?clearOnboardingWelcomePending\(\);[\s\S]*?return;/);
  });

  it('shows exactly the granted amounts — no fallbacks, no invented numbers', () => {
    // Чек-лист наград: в модалке не должно быть «amount || N» и локальных сумм —
    // только константы из welcome_gift.ts, те же, что реально начисляются.
    expect(modal).toContain("import { WELCOME_GIFT_PEARLS, WELCOME_GIFT_RUNES } from '../app/welcome_gift'");
    expect(modal).not.toMatch(/\|\|\s*\d+\s*\}/);
  });

  it('does not promise a personal plan it never built', () => {
    expect(modal).not.toContain('план собран');
  });

  it('respects the owner design bans: no container borders, weights only 400/700', () => {
    // borderRadius разрешён (скругление ≠ обводка), borderWidth/borderColor — нет.
    expect(modal).not.toMatch(/borderWidth|borderColor/);
    const weights = [...modal.matchAll(/fontWeight: '(\d+)'/g)].map((m) => m[1]);
    expect(weights.length).toBeGreaterThan(0);
    expect([...new Set(weights)].sort()).toEqual(['400', '700']);
  });
});

// зачем: владелец (2026-08-26, той же правкой — «сделай чтобы все получили,
// и новый юзер, и все старые кто после обновы откроет приложение тоже»):
// CleanOnboarding ставит PENDING только когда САМ монтируется — пользователь,
// чей onboarding_done уже был на диске до апдейта, никогда бы его не увидел.
describe('Welcome gift reaches existing users after an update, not just new signups', () => {
  it('layout raises the retro path only when onboarding is NOT running this launch', () => {
    expect(rootLayout).toContain('raiseWelcomeGiftForExistingUserIfEligible');
    // Условие обязано читать ФАКТИЧЕСКИЙ результат этого запуска (ref), а не
    // объявленную внутри try const — та вне scope в точке вызова.
    expect(rootLayout).toMatch(/if \(!onboardingPathRef\.current\) void raiseWelcomeGiftForExistingUserIfEligible\(\);/);
  });

  it('the retro path has its own permanent once-guard, separate from the show/hide flag', () => {
    // Один и тот же ONBOARDING_WELCOME_PENDING_KEY снимается КАЖДЫЙ показ —
    // если бы ретро-путь тоже полагался только на него, старый пользователь
    // получал бы предложение подарка на КАЖДОМ холодном старте после закрытия.
    expect(welcomeState).toContain("const RETRO_OFFERED_KEY = 'onboarding_welcome_retro_offered_v1'");
    expect(welcomeState).toMatch(/const alreadyOffered = await AsyncStorage\.getItem\(RETRO_OFFERED_KEY\);\s*\n\s*if \(alreadyOffered === '1'\) return;/);
  });

  // зачем (аудит гонки, владелец 2026-08-26 — «модал появился, но ничего не
  // начислилось»): OnboardingWelcomeHost монтируется в дереве ВСЕГДА и читает
  // диск ОДИН раз на монтировании. Оба писателя PENDING (CleanOnboarding И
  // ретро-путь) пишут ПОЗЖЕ, чем хост успевает прочитать «флага ещё нет» —
  // без события хост никогда не перечитывает диск и подарок молча теряется.
  it('both PENDING writers wake the already-mounted host through an event, not just AsyncStorage', () => {
    expect(events).toContain('onboarding_welcome_pending_raised: undefined');
    // Матчится дважды: markOnboardingWelcomePending (обычный онбординг) И
    // raiseWelcomeGiftForExistingUserIfEligible (ретро-путь) — оба обязаны
    // эмитить событие СРАЗУ после того, как флаг реально лёг на диск.
    const setThenEmit = welcomeState.match(
      /await AsyncStorage\.setItem\(ONBOARDING_WELCOME_PENDING_KEY, '1'\);\s*\n[\s\S]{0,650}?emitAppEvent\('onboarding_welcome_pending_raised'\);/g,
    ) ?? [];
    expect(setThenEmit.length).toBe(2);
    expect(host).toContain("onAppEvent('onboarding_welcome_pending_raised', checkPending)");
  });

  it('the host cannot show the ceremony twice in one process run even if the event fires late', () => {
    // shownThisRunRef гейтит и первый вызов, и повторный по событию — без
    // этого запоздалое событие после закрытия могло бы поднять модалку снова.
    expect(host).toContain('const shownThisRunRef = useRef(false);');
    expect(host).toMatch(/if \(shownThisRunRef\.current \|\| checkInFlightOrDoneRef\.current\) return;/);
  });

  // зачем (аудит 2026-08-26): без синхронного in-flight гейта событие,
  // прилетевшее ПОКА первое чтение диска ещё не разрешилось, проходило мимо
  // shownThisRunRef (тот ставится только внутри .then()) и запускало ВТОРОЕ
  // параллельное чтение + второй beginWelcomeGiftGrant. Деньгам это не
  // вредит (журнал операций и серверный opId сериализуют сами), но лишний
  // параллельный вызов не должен быть возможен архитектурно, не только
  // «получается безопасно благодаря другому слою».
  it('checkPending gates re-entrancy synchronously, before the async disk read resolves', () => {
    expect(host).toContain('const checkInFlightOrDoneRef = { current: false };');
    expect(host).toMatch(
      /if \(shownThisRunRef\.current \|\| checkInFlightOrDoneRef\.current\) return;\s*\n\s*checkInFlightOrDoneRef\.current = true;\s*\n\s*isOnboardingWelcomePending\(\)/,
    );
    // Оба «не показываем» исхода снимают in-flight гейт — иначе один битый
    // диск-ответ навсегда запирал бы хост в состоянии «уже проверяю».
    const releases = host.match(/checkInFlightOrDoneRef\.current = false;/g) ?? [];
    expect(releases.length).toBe(3); // !pending, рубильник выключен, catch
  });
});

describe('Admin controls for onboarding behaviour', () => {
  it('exposes both kill switches in the working admin panel', () => {
    expect(legacy).toContain("saveOnboardingBehaviourFlag('onboarding_skip_enabled'");
    expect(legacy).toContain("saveOnboardingBehaviourFlag('onboarding_welcome_sheet_enabled'");
    expect(legacy).toContain('window.saveControlPanelBool(key, next)');
  });

  it('rolls the toggle back when the write fails', () => {
    expect(legacy).toContain('if (input) input.checked = !next;');
  });

  it('shows the skip percentage without extra Firestore queries', () => {
    expect(legacy).toContain("['Пропустили онбординг'");
    expect(legacy).toContain("r.action === 'onboarding_skip'");
    // Проценты считаем по уникальным пользователям, а не по сырым событиям.
    expect(legacy).toContain('const uniqUsers = (list) =>');
  });
});
