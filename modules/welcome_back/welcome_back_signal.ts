// ═══════════════════════════════════════════════════════════════════════════
// welcome_back_signal.ts — снимок «человек вернулся после долгого отсутствия» в памяти процесса (D193).
//
// зачем (координатор 14.10): корневой layout на старте и на возврате в приложение сначала оценивает winback по прошлой активности, а
// потом ПЕРЕЗАПИСЫВАЕТ её текущим временем (recordLastActive). Окно «С возвращением» решается позже — после первого кадра Главной —
// и увидело бы разрыв ~0. Поэтому recordLastActive перед перезаписью кладёт сюда прошлую активность, если разрыв не меньше порога.
// Только память: после перезапуска процесса снимка нет — значит, это возвращение уже засчитано (прошлая активность перезаписана).
// ═══════════════════════════════════════════════════════════════════════════
import { WELCOME_BACK_MIN_AWAY_MS } from './welcome_back_model';

const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__ === true;

export type WelcomeBackReturnGap = Readonly<{ lastActiveMs: number; detectedAtMs: number; source: 'record_last_active' | 'dev' }>;

let pending: WelcomeBackReturnGap | null = null;
const listeners = new Set<(gap: WelcomeBackReturnGap | null) => void>();

function emit(): void {
  listeners.forEach((listener) => {
    try {
      listener(pending);
    } catch (error) {
      console.warn('[WELCOME-BACK] signal listener failed', String(error)); // guard-ok: catch пишет причину
    }
  });
}

/** Звать ПЕРЕД перезаписью прошлой активности: previousLastActiveMs — то, что лежало в хранилище. */
export function noteWelcomeBackReturnGap(previousLastActiveMs: number | null, nowMs: number): void {
  if (previousLastActiveMs === null || !Number.isFinite(previousLastActiveMs) || previousLastActiveMs <= 0) {
    if (IS_DEV) console.log(`[WELCOME-BACK] signal skip reason=no_previous_activity value=${String(previousLastActiveMs)}`); // guard-ok: ранний выход
    return;
  }
  const awayMs = nowMs - previousLastActiveMs;
  if (awayMs < WELCOME_BACK_MIN_AWAY_MS) {
    if (IS_DEV) console.log(`[WELCOME-BACK] signal skip reason=recent awayDays=${(awayMs / 86_400_000).toFixed(1)}`); // guard-ok: ранний выход
    return;
  }
  pending = { lastActiveMs: previousLastActiveMs, detectedAtMs: nowMs, source: 'record_last_active' };
  console.log(`[WELCOME-BACK] signal set awayDays=${(awayMs / 86_400_000).toFixed(1)} lastActive=${new Date(previousLastActiveMs).toISOString()}`); // guard-ok: одна строка на возвращение
  emit();
}

/** DEV: «человек не заходил N дней» — для превью и прогонов без недели ожидания (только dev-сборка). */
export function setDevWelcomeBackAwayDays(days: number | null, nowMs: number = Date.now()): boolean {
  if (!IS_DEV) {
    console.warn('[WELCOME-BACK] dev away: отклонено — не dev-сборка'); // guard-ok: ранний выход логируется
    return false;
  }
  pending = days !== null && Number.isFinite(days) && days > 0
    ? { lastActiveMs: nowMs - days * 86_400_000, detectedAtMs: nowMs, source: 'dev' }
    : null;
  console.log(`[WELCOME-BACK] dev away=${pending ? days : 'off'}`); // guard-ok: единичный лог dev-ссылки
  emit();
  return true;
}

export function peekWelcomeBackReturnGap(): WelcomeBackReturnGap | null {
  return pending;
}

/** Снять снимок, когда окно показано (или решено не показывать насовсем). */
export function clearWelcomeBackReturnGap(reason: string): void {
  if (!pending) return;
  console.log(`[WELCOME-BACK] signal cleared reason=${reason}`); // guard-ok: одна строка
  pending = null;
  emit();
}

export function subscribeWelcomeBackReturnGap(listener: (gap: WelcomeBackReturnGap | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ── Прошлый заход для героя Главной ─────────────────────────────────────────────────────────────────────────────────────────
// зачем (владелец 22.10, кнопка «По заходам»; «СХУЯЛИ У МЕНЯ ТАКОЕ НАПИСАНО» — «Тебя не было 4 дня», хотя он заходит каждый день):
// сцена Главной считала дни с последнего засчитанного урока. Теперь — с последнего ЗАХОДА: recordLastActive перед перезаписью отдаёт
// сюда прошлую отметку. Держим разрыв ПЕРВОГО захода дня: повторный выход на передний план в тот же день его не обнуляет. Только
// память, как снимок окна выше: после перезапуска процесса в тот же день прошлый заход — сегодня, надписи нет (её уже показали).
// ЗАМОК ВЛАДЕЛЬЦА 22.10: «по заходам» — сторож tests/home_away_by_visits_owner_lock.test.ts, реестр docs/work/OWNER_LOCKS.md.

export type AppVisitGap = Readonly<{
  /** Местный день текущего захода, YYYY-MM-DD. */
  day: string;
  /** Местный день прошлого захода до сегодняшнего; null — отметки не было или она неверна. */
  previousVisitDay: string | null;
  source: 'record_last_active' | 'dev';
}>;

let visitGap: AppVisitGap | null = null;
const visitListeners = new Set<(gap: AppVisitGap | null) => void>();

function localDayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Звать ПЕРЕД перезаписью отметки прошлого захода (recordLastActive): previousLastActiveMs — то, что лежало в хранилище. */
export function noteAppVisit(previousLastActiveMs: number | null, nowMs: number, source: AppVisitGap['source'] = 'record_last_active'): void {
  const today = localDayKey(nowMs);
  const prevOk = previousLastActiveMs !== null && Number.isFinite(previousLastActiveMs) && previousLastActiveMs > 0 && previousLastActiveMs <= nowMs;
  const prevDay = prevOk ? localDayKey(previousLastActiveMs as number) : null;
  const prevText = prevOk ? new Date(previousLastActiveMs as number).toISOString() : String(previousLastActiveMs);
  if (visitGap && visitGap.day === today && prevDay === today) {
    console.log(`[HOME-AWAY] заход: повтор в тот же день — держим разрыв первого захода prevVisitDay=${visitGap.previousVisitDay ?? 'нет'} prev=${prevText} (${source}) today=${today}`); // guard-ok: ранний выход называет причину
    return;
  }
  const branch = !prevOk ? 'no_previous_mark' : prevDay === today ? 'same_day_no_snapshot' : 'first_visit_today';
  visitGap = { day: today, previousVisitDay: prevDay, source };
  console.log(`[HOME-AWAY] заход: prev=${prevText} (${source}) now=${new Date(nowMs).toISOString()} prevVisitDay=${prevDay ?? 'нет'} today=${today} ветка=${branch}`); // guard-ok: одна строка на выход на передний план
  visitListeners.forEach((listener) => {
    try {
      listener(visitGap);
    } catch (error) {
      console.warn('[HOME-AWAY] подписчик захода упал', String(error)); // guard-ok: catch пишет причину
    }
  });
}

export function peekAppVisitGap(): AppVisitGap | null {
  return visitGap;
}

export function subscribeAppVisitGap(listener: (gap: AppVisitGap | null) => void): () => void {
  visitListeners.add(listener);
  return () => { visitListeners.delete(listener); };
}

/** Только тесты: «новый процесс» — снимка захода нет. */
export function __resetAppVisitGapForTests(): void {
  visitGap = null;
}
