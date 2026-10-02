/*
 * Release-метка первого кадра Главной: одна строка `[HOME-PAINT]` на запуск JS.
 *
 * зачем (координатор §70/§78, 2026-10-02): «до видимой Главной» мерили опросом
 * uiautomator — один снимок экрана на слабом эмуляторе ≈ 1 с, разброс одной сборки
 * 1,9 с, и регрессию Главной было не отличить от шума. Теперь Главная сама пишет
 * строку после первого кадра; время считается по отметкам logcat от строки старта
 * процесса (ActivityManager «Start proc»), так что нативный код не нужен.
 *
 * Дёшево по построению: один requestAnimationFrame и один console.log за запуск,
 * без setState и без ре-рендера. performance.now() — для сверки, если доступен.
 */

let homePaintLogged = false;

export function markHomeFirstPaint(): void {
  if (homePaintLogged) return;
  homePaintLogged = true;
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 0);
  schedule(() => {
    const perf = (globalThis as { performance?: { now?: () => number } }).performance;
    const sinceRuntimeMs = typeof perf?.now === 'function' ? Math.round(perf.now()) : -1;
    console.log(`[HOME-PAINT] first_frame epochMs=${Date.now()} sinceRuntimeMs=${sinceRuntimeMs}`);
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
