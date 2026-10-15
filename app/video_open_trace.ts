// ═══════════════════════════════════════════════════════════════════════════
// video_open_trace.ts — [VIDEO-OPEN-TRACE]: цепочка «тап по ролику → экран ролика открыт», каждая отметка с мс от тапа.
//
// зачем (координатор 15.10, R59 «Видео»: ролик открывается ~1,7 с, причина неизвестна; «сперва логи»): тап → router.push → первый render экрана ролика → mount →
// снимок каталога (есть/нет) → поиск набора → фразы ролика (откуда, сколько) → плеер/WebView mount → onLayout. Активна 20 с после тапа. console.warn: production вырезает console.log.
// ═══════════════════════════════════════════════════════════════════════════
const ACTIVE_MS = 20_000;
let startedAt: number | null = null;
let source = '';

export function videoOpenTraceStart(from: string, now: number = Date.now()): void {
  startedAt = now;
  source = from;
  console.warn(`[VIDEO-OPEN-TRACE] +0ms start source=${from}`); // guard-ok: начало цепочки
}

export function videoOpenMark(label: string, now: number = Date.now()): void {
  if (startedAt === null) return;
  const elapsed = now - startedAt;
  if (elapsed > ACTIVE_MS) { startedAt = null; return; }
  console.warn(`[VIDEO-OPEN-TRACE] +${elapsed}ms ${label} source=${source}`); // guard-ok: отметка цепочки
}

export function __resetVideoOpenTraceForTests(): void {
  startedAt = null;
  source = '';
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
