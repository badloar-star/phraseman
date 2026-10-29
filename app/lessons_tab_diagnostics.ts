// lessons_tab_diagnostics.ts — события диагностики обращений по вкладке «Уроки»: ПОЧЕМУ ушли с вкладки и ЗА СКОЛЬКО она показала первый кадр.
//
// зачем (координатор 28.10, жалобы с боевых телефонов 2.0.3: «Уроки → course → lessons → /home», «курс открывается не полностью»): console в
// релизе в обращения не попадает, а по коду причину ухода с вкладки не определить (в 147 /lessons → /home даёт ровно один путь — редирект скрытой
// вкладки, но у людей с целью en он невозможен). Поэтому пишем СОБЫТИЕМ журнала обращений (recordSupportDiagnostic → «Поддержка» → админка):
//   event 'feature_action', screen '/lessons', result 'info'
//   action 'lessons:leave:<reason>'            — reason: hidden_tab_redirect | back_button | tab_bar_tap | route_param | tab_switch
//   action 'lessons:first_frame_ms:<bucket>'   — bucket: lt1s | 1to3s | 3to8s | gt8s; точное значение в durationMs.
// Белый список сервера (functions/src/client_reports.ts → safeDiagnosticAction): ^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$ и нет «слова» из 20+ букв/цифр между
// разделителями; оба действия ему удовлетворяют (замок — tests/lessons_tab_diagnostics.test.ts). Персональных данных в событии нет: ни id, ни текста.
import { recordSupportDiagnostic } from './support_diagnostics';
import { JS_STARTED_AT_MS } from './cold_start_diagnostics';

const LOG = '[LESSONS-LEAVE]';
const SCREEN = '/lessons';
/** Старт замера живёт недолго: нажатие, после которого вкладка так и не показалась, не должно склеиться со следующим показом. */
const OPEN_START_TTL_MS = 30_000;
/** Явная причина ухода перекрывает «неявную» (tab_switch), пришедшую следом из эффекта видимости. */
const EXPLICIT_LEAVE_WINDOW_MS = 1_500;

/** Тап пришёл в первые 45 с жизни JS — холодный старт (метка app:cold_start:* пишется отдельно). */
const COLD_TAP_WINDOW_MS = 45_000;

export type LessonsStage = 'module_ready' | 'first_render';
export type LessonsLeaveReason = 'hidden_tab_redirect' | 'back_button' | 'tab_bar_tap' | 'route_param' | 'tab_switch';
export type LessonsFirstFrameBucket = 'lt1s' | '1to3s' | '3to8s' | 'gt8s';

export function lessonsFirstFrameBucket(ms: number): LessonsFirstFrameBucket {
  if (ms < 1_000) return 'lt1s';
  if (ms < 3_000) return '1to3s';
  if (ms < 8_000) return '3to8s';
  return 'gt8s';
}

let openStartedAtMs: number | null = null;
let openSource = '';
let openCold = false;
let moduleReady = false;
let stagesNoted = new Set<LessonsStage>();
let lastExplicitLeaveAtMs = 0;
let lastLeaveKey = '';
let lastLeaveAtMs = 0;

/** Тап по входу в «Уроки» (плитка Главной, таббар): с этого момента меряем «первый кадр». */
export function noteLessonsOpenStart(source: string, nowMs: number = Date.now()): void {
  openStartedAtMs = nowMs;
  openSource = source;
  openCold = nowMs - JS_STARTED_AT_MS < COLD_TAP_WINDOW_MS;
  stagesNoted = new Set<LessonsStage>();
  console.log(`${LOG} open_start`, JSON.stringify({ source, cold: openCold, moduleReady, sinceJsStartMs: nowMs - JS_STARTED_AT_MS })); // guard-ok: одна строка на тап по входу в «Уроки»
  // что ждёт экран в момент тапа: холодный ли старт и загружен ли уже модуль вкладки (если нет — пустой экран держит его загрузка)
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: `lessons:open:${openCold ? 'cold' : 'warm'}:${moduleReady ? 'module_ready' : 'module_pending'}`,
    screen: SCREEN,
    result: 'info',
    subject: 'app',
    atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn(`${LOG} запись open не удалась`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи журнала не ломает вход
  });
}

/** Модуль вкладки «Уроки» загружен (вызывается из lessons.tsx на уровне модуля). Если тап уже был — пишем, через сколько мс от тапа. */
export function noteLessonsModuleReady(nowMs: number = Date.now()): void {
  moduleReady = true;
  noteLessonsStage('module_ready', nowMs);
}

/** Этап загрузки «Уроков» после тапа: мс от тапа в корзину. Без метки тапа (премаунт в фоне) — только журнал в консоли. */
export function noteLessonsStage(stage: LessonsStage, nowMs: number = Date.now()): void {
  if (openStartedAtMs === null) {
    console.log(`${LOG} stage ${stage}: без метки тапа (фон/премаунт)`, JSON.stringify({ sinceJsStartMs: nowMs - JS_STARTED_AT_MS })); // guard-ok: ранний выход называет причину
    return;
  }
  if (stagesNoted.has(stage)) return;
  stagesNoted.add(stage);
  const ms = Math.max(0, Math.round(nowMs - openStartedAtMs));
  const bucket = lessonsFirstFrameBucket(ms);
  console.log(`${LOG} stage ${stage}`, JSON.stringify({ ms, bucket, cold: openCold, source: openSource })); // guard-ok: итог этапа
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: `lessons:stage:${stage}:${bucket}${openCold ? ':cold' : ''}`,
    screen: SCREEN,
    result: 'info',
    subject: 'app',
    durationMs: ms,
    atMs: nowMs,
  }).catch((error: unknown) => {
    console.warn(`${LOG} запись stage не удалась`, error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи журнала не ломает вход
  });
}

/** Первый кадр вкладки после тапа. Нет метки старта — события нет, причина в журнале (иначе замерили бы только rAF). */
export function noteLessonsFirstFrame(nowMs: number = Date.now()): void {
  if (openStartedAtMs === null) {
    console.log(`${LOG} first_frame: пропуск — метки тапа нет (вкладка показана без нашего старта)`, JSON.stringify({})); // guard-ok: ранний выход называет причину
    return;
  }
  const ms = Math.max(0, Math.round(nowMs - openStartedAtMs));
  const source = openSource;
  const cold = openCold;
  const expired = ms > OPEN_START_TTL_MS;
  openStartedAtMs = null;
  openSource = '';
  openCold = false;
  if (expired) {
    console.log(`${LOG} first_frame: пропуск — метка тапа протухла`, JSON.stringify({ ms, source, ttlMs: OPEN_START_TTL_MS })); // guard-ok: ранний выход называет причину
    return;
  }
  const bucket = lessonsFirstFrameBucket(ms);
  console.log(`${LOG} first_frame`, JSON.stringify({ ms, bucket, source, cold })); // guard-ok: итог замера
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: `lessons:first_frame_ms:${bucket}${cold ? ':cold' : ''}`,
    screen: SCREEN,
    result: 'info',
    subject: 'app',
    durationMs: ms,
    atMs: nowMs,
  });
}

/** Причина ухода с вкладки. Повтор той же причины в пределах секунды и неявный tab_switch следом за явной причиной не пишутся. */
export function noteLessonsLeave(reason: LessonsLeaveReason, detail?: Readonly<Record<string, string | number | boolean | null>>, nowMs: number = Date.now()): void {
  if (reason === 'tab_switch' && nowMs - lastExplicitLeaveAtMs < EXPLICIT_LEAVE_WINDOW_MS) {
    console.log(`${LOG} пропуск tab_switch — явная причина уже записана`, JSON.stringify({ sinceExplicitMs: nowMs - lastExplicitLeaveAtMs })); // guard-ok: ранний выход называет причину
    return;
  }
  if (lastLeaveKey === reason && nowMs - lastLeaveAtMs < 1_000) {
    console.log(`${LOG} пропуск дубля`, JSON.stringify({ reason, sinceMs: nowMs - lastLeaveAtMs })); // guard-ok: ранний выход называет причину
    return;
  }
  lastLeaveKey = reason;
  lastLeaveAtMs = nowMs;
  if (reason !== 'tab_switch') lastExplicitLeaveAtMs = nowMs;
  console.log(`${LOG} leave`, JSON.stringify({ reason, ...(detail ?? {}) })); // guard-ok: одна строка на уход с вкладки
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: `lessons:leave:${reason}`,
    screen: SCREEN,
    result: 'info',
    subject: 'app',
    atMs: nowMs,
  });
}

export function resetLessonsTabDiagnosticsForTests(): void {
  openStartedAtMs = null;
  openSource = '';
  openCold = false;
  moduleReady = false;
  stagesNoted = new Set<LessonsStage>();
  lastExplicitLeaveAtMs = 0;
  lastLeaveKey = '';
  lastLeaveAtMs = 0;
}

export default function __RouteShim() { return null; }
