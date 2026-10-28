// lessons_open_v2_request.ts — тихий запрос «открой на вкладке «Уроки» карту V2» от плитки Главной (память процесса, без хранилища и сети).
//
// зачем (владелец 28.10 «кнопка Уроки не работает»; замер Сверки: холодный старт + тап = ~8 с пустого экрана, двойная навигация push /learning-v2/course → dismissTo): плитка раньше пушила пустой
// маршрут курса, тот ждал runAfterInteractions и лишь затем делал dismissTo на вкладку с ?courseEntry=v2. Теперь плитка сразу переключает вкладку (как тап по таббару), а «выбери карту V2» передаёт
// этим флагом: вкладка «Уроки» забирает его при фокусе (то же действие, что делала ссылка courseEntry=v2, — для тех, у кого последним был классический список).
// Запрос живёт недолго (TTL), чтобы устаревший флаг не открыл карту при следующем заходе без плитки.
const TTL_MS = 5000;
const LOG = '[HOME-LESSONS-BTN]';

let requestedAtMs: number | null = null;
let requestReason = '';

export function requestLessonsV2Page(reason: string): void {
  requestedAtMs = Date.now();
  requestReason = reason;
  console.log(`${LOG} v2_page_requested`, JSON.stringify({ reason })); // guard-ok: одна строка на тап по плитке
}

/** Миллисекунды с момента запроса (для замера «тап → карта на экране»); нет запроса — null. */
export function peekLessonsV2PageRequestAgeMs(nowMs: number = Date.now()): number | null {
  return requestedAtMs === null ? null : nowMs - requestedAtMs;
}

/** Забрать запрос: true — выбрать карту V2. Просроченный запрос сбрасывается с причиной в журнале. */
export function consumeLessonsV2PageRequest(nowMs: number = Date.now()): boolean {
  if (requestedAtMs === null) return false;
  const age = nowMs - requestedAtMs;
  const reason = requestReason;
  requestedAtMs = null;
  requestReason = '';
  if (age > TTL_MS) {
    console.warn(`${LOG} v2_page_request_expired`, JSON.stringify({ reason, ageMs: age, ttlMs: TTL_MS })); // guard-ok: ранний выход называет причину
    return false;
  }
  console.log(`${LOG} v2_page_request_consumed`, JSON.stringify({ reason, ageMs: age })); // guard-ok: одна строка на применение
  return true;
}

export function resetLessonsV2PageRequestForTests(): void {
  requestedAtMs = null;
  requestReason = '';
}

export default function __RouteShim() { return null; }
