/*
 * Release-метка первого кадра Главной: одна строка `[HOME-PAINT]` на запуск JS.
 *
 * зачем (координатор §70/§78, 2026-10-02): «до видимой Главной» мерили опросом
 * uiautomator — один снимок экрана на слабом эмуляторе ≈ 1 с, разброс одной сборки
 * 1,9 с, и регрессию Главной было не отличить от шума. Теперь Главная сама пишет
 * строку после первого кадра; время считается по отметкам logcat от строки старта
 * процесса (ActivityManager «Start proc»), так что нативный код не нужен.
 *
 * Дёшево по построению: один requestAnimationFrame и один console.warn за запуск,
 * без setState и без ре-рендера.
 *
 * Именно console.warn: babel.config.js в production вырезает console.log/info/debug
 * (transform-remove-console, exclude warn/error) — первая версия метки в release молчала.
 *
 * зачем (координатор 04.10, холодный старт): «после первого кадра Главной» отпускалось событием оболочки
 * вкладок, которое приходит ДО кадра ленивой Главной (замер «после»: посев озвучки стартовал на 1–5 с
 * раньше HOME-PAINT). Настоящий кадр сообщаем через globalThis — в дев-сборке ленивый чанк Главной
 * живёт со своим экземпляром модулей, и шина событий может его не связать с корнем.
 */
import { takeModuleEvalReport } from './cold_start_entry_mark';

type PaintHolder = { __phrasemanHomePaintedAt?: number; __phrasemanHomePaintWaiters?: Array<() => void> };
const paintHolder = globalThis as PaintHolder;

let homePaintLogged = false;

export function markHomeFirstPaint(): void {
  if (homePaintLogged) return;
  homePaintLogged = true;
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 0);
  schedule(() => {
    // performance.now() здесь не годится: на эмуляторе он рос от старта к старту (не от запуска процесса).
    console.warn(`[HOME-PAINT] first_frame epochMs=${Date.now()}`);
    // Дев: что исполнялось между концом импортов корня и кадром Главной (ленивый чанк Главной и т.п.).
    const moduleReport = takeModuleEvalReport(15, { stop: true });
    if (moduleReport) {
      // зачем (координатор 05.10): logcat режет строки ~4000 символов — цепочки требователей отдельной строкой.
      const { chains, ...rest } = moduleReport;
      console.warn(`[COLD-START] home_paint.module_eval ${JSON.stringify(rest)}`);
      console.warn(`[COLD-START] home_paint.module_eval:chains ${chains}`);
    }
    if (typeof paintHolder.__phrasemanHomePaintedAt !== 'number') {
      paintHolder.__phrasemanHomePaintedAt = Date.now();
      const waiters = paintHolder.__phrasemanHomePaintWaiters ?? [];
      paintHolder.__phrasemanHomePaintWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  });
}

/**
 * Ждать настоящего кадра Главной (или потолка). Для тяжёлой фоновой работы, которой нельзя делить
 * JS-поток с первым кадром. Возвращает, чем закончилось ожидание.
 */
export function whenHomePainted(ceilingMs: number): Promise<'painted' | 'ceiling'> {
  if (typeof paintHolder.__phrasemanHomePaintedAt === 'number') return Promise.resolve('painted');
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('ceiling'), ceilingMs);
    const waiters = paintHolder.__phrasemanHomePaintWaiters ?? [];
    waiters.push(() => {
      clearTimeout(timer);
      resolve('painted');
    });
    paintHolder.__phrasemanHomePaintWaiters = waiters;
  });
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
