/**
 * Крутить ли живой фон премиум-темы (PremiumThemeMotion) прямо сейчас — чистое правило, его проверяет тест.
 *
 * зачем (координатор 25.10, владелец «скролл стал дёрганым, на главной»): WebView с шейдером/CSS-анимацией на всю сцену Главной
 * рисовал каждый кадр и во время прокрутки, и когда Главная была не на виду (вкладки не размонтируются, react-freeze рисование
 * WebView не останавливает), и в фоне приложения. Движение идёт только когда Главная на виду, приложение активно и прокрутки нет.
 */
export const PREMIUM_MOTION_PAUSE_ON_SCROLL = true;

export type PremiumMotionGateInput = Readonly<{
  homeVisible: boolean;
  screenFocused: boolean;
  appActive: boolean;
  scrolling: boolean;
  reducedMotion: boolean;
}>;

export type PremiumMotionGateReason = 'reduced_motion' | 'app_background' | 'home_hidden' | 'screen_unfocused' | 'scrolling' | 'running';

/** Первая причина паузы или 'running' — для журнала [THEME-MOTION] (печатаем, ЧТО решило). */
export function premiumMotionGateReason(input: PremiumMotionGateInput): PremiumMotionGateReason {
  if (input.reducedMotion) return 'reduced_motion';
  if (!input.appActive) return 'app_background';
  if (!input.homeVisible) return 'home_hidden';
  if (!input.screenFocused) return 'screen_unfocused';
  if (PREMIUM_MOTION_PAUSE_ON_SCROLL && input.scrolling) return 'scrolling';
  return 'running';
}

export function premiumMotionShouldRun(input: PremiumMotionGateInput): boolean {
  return premiumMotionGateReason(input) === 'running';
}

/** Скрипт для WebView: включить/выключить движение страницы (страница сама тормозит/разгоняется). */
export function premiumMotionSetRunningScript(running: boolean): string {
  return `window.__pmSetRunning&&window.__pmSetRunning(${running ? 'true' : 'false'});true;`;
}
