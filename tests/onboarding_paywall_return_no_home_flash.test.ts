import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const layout = read('app/_layout.tsx');
const purchase = read('app/paywall_purchase.ts');
const onboarding = read('components/onboarding.tsx');

/** Убирает построчные // комментарии — чтобы текст пояснений не давал ложных
 *  срабатываний при поиске исполняемого кода (router.replace / await и т.п.). */
const stripLineComments = (src: string): string =>
  src
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
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
    const start = purchase.indexOf("if (source === 'onboarding_plan')");
    expect(start).toBeGreaterThan(-1);
    // тело ветки до её return
    const end = purchase.indexOf('return;', start) + 'return;'.length;
    const branch = stripLineComments(purchase.slice(start, end));
    expect(branch).toContain("emitAppEvent('personal_plan_onboarding_nickname_ready')");
    expect(branch).not.toContain("router.replace('/(tabs)/home'");
  });

  it('successful onboarding purchase return does NOT navigate to home', () => {
    const start = purchase.indexOf('const finishPersonalPlanActivationFlow');
    expect(start).toBeGreaterThan(-1);
    const end = purchase.indexOf('}, [reloadEnergy, router]);', start);
    const fn = stripLineComments(purchase.slice(start, end));
    // в онбординг-ветке (pendingNickname === '1') эмитим событие, но НЕ идём на home
    const nickStart = fn.indexOf("if (pendingNickname === '1')");
    expect(nickStart).toBeGreaterThan(-1);
    const nickEnd = fn.indexOf('return;', nickStart) + 'return;'.length;
    const nickBranch = fn.slice(nickStart, nickEnd);
    expect(nickBranch).toContain("emitAppEvent('personal_plan_onboarding_nickname_ready')");
    expect(nickBranch).not.toContain("router.replace('/(tabs)/home'");
    // обычная (не-онбординг) покупка по-прежнему ведёт на thank-you
    expect(fn).toContain("router.replace('/personal_plan_thank_you' as any)");
  });

  it('layout listener raises the onboarding overlay synchronously before any await', () => {
    const start = layout.indexOf("onAppEvent('personal_plan_onboarding_nickname_ready'");
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
    const start = layout.indexOf("onAppEvent('personal_plan_onboarding_nickname_ready'");
    const end = layout.indexOf('return () => sub.remove();', start);
    const body = layout.slice(start, end);
    expect(body).toContain('setOnboardingStartAtName(true)');
    // и прокидывает флаг в компонент
    expect(layout).toContain('startAtNameStep={onboardingStartAtName}');
    // и сбрасывает его по завершении онбординга (чтобы новый показ резолвил A/B штатно)
    expect(layout).toContain('setOnboardingStartAtName(false)');
  });

  it('onboarding mounts at name synchronously (no resolving-gate, no getStableId await) on fast path', () => {
    expect(onboarding).toContain('startAtNameStep');
    // peekStableId — синхронный кэш, без await/Keychain
    expect(onboarding).toContain('peekStableId');
    const code = stripLineComments(onboarding);
    // onboardingEntryReady стартует true на быстром пути → пустой resolving-экран пропущен
    expect(code).toContain('useState(synchronousNameEntry)');
    // начальный шаг = 'name' на быстром пути
    expect(code).toMatch(/synchronousNameEntry\s*\?\s*'name'/);
  });
});
