/**
 * [COLD-START] — временная трасса холодного старта (координатор §80, 02.10).
 *
 * зачем: «Дизайн» измерил 8–11 с на открытии phone-state и 17,7 с до готовности тренировки
 * карточек. Чтобы вынести тяжёлое с критического пути по ФАКТАМ, а не по догадке, каждый
 * шаг пишет одну строку: мс от старта процесса (performance.now — в RN отсчёт от запуска
 * процесса), длительность шага и источник (какой модуль/ветка). Одна строка grep-ом
 * `[COLD-START]` даёт всю цепочку. Убрать после выноса (логи ранних выходов — оставить).
 */
export function coldStartProcessMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? Math.round(perf.now()) : -1;
}

export function coldStartMark(label: string, source: string, detail?: Readonly<Record<string, unknown>>): void {
  const suffix = detail ? ` ${JSON.stringify(detail)}` : '';
  console.log(`[COLD-START] ${label} proc=${coldStartProcessMs()}ms src=${source}${suffix}`);
}

/** Отметка начала шага; возвращённая функция пишет конец с длительностью. */
export function coldStartStep(label: string, source: string): (outcome?: string) => void {
  const startedAt = Date.now();
  coldStartMark(`${label}:start`, source);
  return (outcome = 'ok') => {
    coldStartMark(`${label}:${outcome}`, source, { stepMs: Date.now() - startedAt });
  };
}

/* expo-router: keep this utility from being treated as a screen */
export default function __ColdStartTraceRouteShim() {
  return null;
}
