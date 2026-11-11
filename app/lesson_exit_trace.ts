// зачем (§126, баг «урок закрывается после 2–6 верных ответов и уходит на главную», iPhone iOS 26.7, Plus, 03.10): сперва логи,
// потом починка. Каждый выход с экрана урока пишет запись [LESSON-EXIT] с причиной и значением, решившим ветку; размонтирование
// без парной записи выхода = внешняя причина (router.replace из корневого лейаута, сброс навигации). Для пользователей из
// релиза запись уходит и в activity (при согласии на аналитику), в консоль — console.warn (log/info в release вырезаны).
import { trackActivity } from './app_activity';
import { recordSupportDiagnostic } from './support_diagnostics';

export type LessonExitTraceData = Readonly<Record<string, string | number | boolean | null | undefined>>;

export function formatLessonExitTrace(reason: string, data: LessonExitTraceData): string {
  const parts = Object.entries(data).map(([key, value]) => `${key}=${String(value)}`);
  return `[LESSON-EXIT] ${reason} ${parts.join(' ')}`.trim();
}

/**
 * Действие для журнала обращений: lesson:exit:<reason>[:l<id>] — причина и номер урока числом (координатор 28.10). Только знаки из белого списка сервера
 * (safeDiagnosticAction: ^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$), длина ≤ 80: причина укорачивается, id остаётся.
 */
export function lessonExitSupportAction(reason: string, data: LessonExitTraceData = {}): string {
  const id = typeof data.lessonId === 'number' && Number.isFinite(data.lessonId) ? ':l' + Math.trunc(data.lessonId) : '';
  const base = ('lesson:exit:' + reason).replace(/[^a-zA-Z0-9_.:-]/g, '_');
  return base.slice(0, 80 - id.length) + id;
}

// зачем (владелец 11.11 «убрать работу впустую», аудит расходов): трассы корня (layout:*) срабатывают на КАЖДОМ холодном старте —
// это 3–4 серверных вызова submitClientReport на запуск (замер: 1 176 вызовов/нед по 3,8 с), хотя урока не было и улики в них нет.
// Уликой к §126 они становятся только рядом с выходом из урока. Поэтому на сервер трасса корня уходит, лишь если в пределах окна
// был или случился выход из урока; до тех пор она лежит в памяти. В консоль и журнал обращений — по-прежнему всегда.
const LAYOUT_TRACE_WINDOW_MS = 60_000;
const LAYOUT_TRACE_HELD_MAX = 8;
type HeldLayoutTrace = Readonly<{ reason: string; data: LessonExitTraceData; atMs: number }>;
let heldLayoutTraces: readonly HeldLayoutTrace[] = [];
let lastLessonTraceAtMs = 0;

export function resetLessonExitTraceStateForTests(): void {
  heldLayoutTraces = [];
  lastLessonTraceAtMs = 0;
}

function sendLessonExitActivity(reason: string, data: LessonExitTraceData): void {
  void trackActivity(`lesson:exit_trace`, {
    feature: 'navigation',
    screen: 'lesson1',
    result: 'info',
    writeToFirestore: true,
    tags: { reason, ...data },
  }).catch((error: unknown) => {
    console.warn('[LESSON-EXIT] trackActivity:catch', error instanceof Error ? error.message : String(error));
  });
}

export function traceLessonExit(reason: string, data: LessonExitTraceData = {}): void {
  console.warn(formatLessonExitTrace(reason, data));
  // зачем (жалоба #3): console в релизе в обращения не попадает — причина выхода и id урока идут событием журнала обращений. Трассы корня (layout:*) — экран «/».
  void recordSupportDiagnostic({
    event: 'feature_action',
    action: lessonExitSupportAction(reason, data),
    screen: reason.startsWith('layout:') ? '/' : '/lesson1',
    result: 'info',
    subject: 'app',
  }).catch((error: unknown) => {
    console.warn('[LESSON-EXIT] supportDiagnostic:catch', error instanceof Error ? error.message : String(error)); // guard-ok: сбой записи журнала не роняет выход
  });
  const nowMs = Date.now();
  if (reason.startsWith('layout:')) {
    if (nowMs - lastLessonTraceAtMs <= LAYOUT_TRACE_WINDOW_MS) {
      sendLessonExitActivity(reason, data);
      return;
    }
    // Урока рядом не было: придерживаем (свежие, не больше LAYOUT_TRACE_HELD_MAX) — уйдут вместе с ближайшим выходом из урока.
    heldLayoutTraces = [...heldLayoutTraces, { reason, data, atMs: nowMs }]
      .filter((held) => nowMs - held.atMs <= LAYOUT_TRACE_WINDOW_MS)
      .slice(-LAYOUT_TRACE_HELD_MAX);
    return;
  }
  const fresh = heldLayoutTraces.filter((held) => nowMs - held.atMs <= LAYOUT_TRACE_WINDOW_MS);
  heldLayoutTraces = [];
  lastLessonTraceAtMs = nowMs;
  // heldMs — сколько трасса корня ждала выхода из урока: по нему восстанавливается исходный порядок событий.
  for (const held of fresh) sendLessonExitActivity(held.reason, { ...held.data, heldMs: nowMs - held.atMs });
  sendLessonExitActivity(reason, data);
}
