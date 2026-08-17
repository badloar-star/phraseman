import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const layout = read('app/_layout.tsx');
const purchase = read('app/paywall_purchase.ts');
const onboarding = read('components/CleanOnboarding.tsx');

/** Убирает построчные // комментарии — чтобы текст пояснений не давал ложных
 *  срабатываний при поиске исполняемого кода (router.replace / await и т.п.). */
const stripLineComments = (src: string): string =>
  src
    .split('\n')
    .map((line) => line.slice(0, line.indexOf('//') === -1 ? line.length : line.indexOf('//')))
    .join('\n');

// ─────────────────────────────────────────────────────────────────────────────
// БАГ (две жалобы пользователя на онбординг):
//  1) После «Продолжить бесплатно» на пейволе экран «думает» ~4 секунды, прежде
//     чем показать следующий шаг онбординга (ввод имени).
//  2) Перед экраном имени на долю секунды мелькает «Главная».
//
// КОРЕНЬ обоих: оба пути возврата из онбординг-пейвола (continue_free И успешная
// покупка) делали `router.replace('/(tabs)/home')`. Онбординг-оверлей —
// непрозрачный absoluteFill (zIndex/elevation 50), он и так перекрывает любой
// маршрут под собой. Навигация на «Главную» (а) монтирует тяжёлый домашний экран
// (отсюда «думает 4 сек») и (б) на один кадр показывает «Главную» до того, как
// setShow(true) поднимет оверлей (отсюда «мелькание home перед именем»).
//
// ФИКС:
//  • paywall_purchase.ts — оба онбординг-возврата НЕ навигируют на home; только
//    выставляют onboarding_step='name' и эмитят событие. Оверлей сам перекрывает
//    оставшийся под ним пейвол.
//  • _layout.tsx listener — setShow(true) вызывается СИНХРОННО (до любых await),
//    чтобы непрозрачный оверлей встал в ближайшем кадре, без окна для мелькания.
// ─────────────────────────────────────────────────────────────────────────────

describe('onboarding ← paywall return: no home flash, no 4s stall', () => {
  it('continue_free during onboarding does NOT navigate to home', () => {
    const start = purchase.indexOf("if (source === 'onboarding')", purchase.indexOf('const doClose'));
    expect(start).toBeGreaterThan(-1);
    // тело ветки до её return
    const end = purchase.indexOf('return;', start) + 'return;'.length;
    const branch = stripLineComments(purchase.slice(start, end));
    expect(branch).toContain("emitAppEvent('onboarding_paywall_completed')");
    expect(branch).not.toContain("router.replace('/(tabs)/home'");
  });

  it('successful onboarding purchase return does NOT navigate to home', () => {
    const start = purchase.indexOf('const finishOnboardingPaywallFlow');
    expect(start).toBeGreaterThan(-1);
    const end = purchase.indexOf('}, [refillToMax]);', start);
    const fn = stripLineComments(purchase.slice(start, end));
    expect(fn).toContain("emitAppEvent('onboarding_paywall_completed')");
    expect(fn).not.toContain("router.replace('/(tabs)/home'");
  });

  it('layout listener raises the onboarding overlay synchronously before any await', () => {
    const start = layout.indexOf("onAppEvent('onboarding_paywall_completed'");
    expect(start).toBeGreaterThan(-1);
    const end = layout.indexOf('return () => sub.remove();', start);
    // Вырезаем построчные // комментарии, чтобы слово "await" в пояснении не давало
    // ложного срабатывания — нас интересует только исполняемый код.
    const body = stripLineComments(layout.slice(start, end));
    expect(body).toContain('setShow(true)');
    // setShow(true) должен стоять ДО первого реального await — иначе остаётся
    // кадр без оверлея, в который виден нижележащий маршрут («Главная»).
    const showAt = body.indexOf('setShow(true)');
    const firstAwait = body.indexOf('await ');
    if (firstAwait !== -1) {
      expect(showAt).toBeLessThan(firstAwait);
    }
  });

  // ── Вторая итерация: «всё равно думает после кнопки» ──────────────────────────
  // Даже без навигации на home онбординг-оверлей при переоткрытии монтировался
  // заново и показывал ПУСТОЙ «resolving»-экран, пока async-эффект ждал
  // getStableId() (Keychain) + два AsyncStorage.getItem, прежде чем снять
  // onboardingEntryReady-гейт. Это и есть «думает». ФИКС: при переоткрытии на
  // шаге «Имя» стартуем синхронно — step='name' и onboardingEntryReady=true в
  // первом рендере, A/B-вариант берём из peekStableId() (кэш в памяти, без await).
  it('layout marks the re-shown onboarding to start synchronously at the name step', () => {
    const start = layout.indexOf("onAppEvent('onboarding_paywall_completed'");
    const end = layout.indexOf('return () => sub.remove();', start);
    const body = layout.slice(start, end);
    expect(body).toContain('setOnboardingStartAtName(true)');
    // и прокидывает флаг в компонент
    expect(layout).toContain('startAtNameStep={onboardingStartAtName}');
    // и сбрасывает его по завершении онбординга (чтобы новый показ резолвил A/B штатно)
    expect(layout).toContain('setOnboardingStartAtName(false)');
  });

  // 2026-08-17 (Bevel): согласия («name») собираются ДО цен, поэтому возврат после
  // покупки ничего не показывает — быстрый путь сразу завершает онбординг
  // (completeOnboarding → onDone), без чтения stable-id и без кадра чужого шага.
  it('onboarding on the fast path completes synchronously-armed (no resolving-gate, no getStableId await)', () => {
    expect(onboarding).toContain('startAtNameStep');
    const code = stripLineComments(onboarding);
    // The fast path no longer needs any stable-id read at all, so there is no
    // Keychain/AsyncStorage identity await before handing control back.
    expect(code).not.toContain('getStableId');
    expect(code).toContain("useState<CleanOnboardingStep>(startAtNameStep ? 'name' : 'welcome')");
    expect(code).toContain("if (startAtNameStep) {");
    expect(code).toContain('void completeOnboardingRef.current();');
  });
});
