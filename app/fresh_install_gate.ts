/**
 * Ворота «свежая установка» для объявлений о новинках.
 *
 * зачем (координатор 12.10, находка Сверки): новичок сразу после онбординга видел поверх Главной объявление «Замочки ушли в отпуск!» —
 * но «старого» он ничего не видел, «что нового» ему не нужно. Объявления с показом при входе не показываем, если онбординг завершён в этом
 * же запуске или менее 48 ч назад (владелец 22.10; было «суток»). Источник — локальная отметка времени завершения онбординга (без сети и Firestore). Нет отметки (все
 * прежние пользователи, восстановленные аккаунты) → не новичок. Часы устройства ушли вперёд — отметке не верим, чтобы не скрыть объявления навсегда.
 * Логи: [APP-MESSAGE] skip reason=fresh_install; решение окна по каждому сообщению — [INBOX-MODAL].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ONBOARDING_COMPLETED_AT_KEY = 'onboarding_completed_at_ms_v1';
/**
 * зачем (владелец 22.10: «модал уведомления от команды не показывался тем, кто только скачал приложение» — только тем, кто в
 * приложении уже 2 дня): окно новичка — 48 ч от первого входа (было 24 ч). Сообщение тем временем тихо лежит во «Входящих».
 */
export const FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS = 48 * 60 * 60 * 1000;
/** Допуск на расхождение часов: отметка «из будущего» дальше этого — недостоверна. */
export const FRESH_INSTALL_CLOCK_SKEW_TOLERANCE_MS = 5 * 60 * 1000;

export type FreshInstallVerdict = Readonly<{
  fresh: boolean;
  reason: 'recent' | 'old' | 'no_timestamp' | 'clock_skew' | 'read_failed';
  ageMs: number | null;
  /** Первый вход человека (отметка завершения онбординга); null — нет достоверной отметки (прежний пользователь, сбой, часы). */
  firstEntryMs?: number | null;
}>;

/** Чистое правило: свежая ли установка по отметке завершения онбординга. */
export function judgeFreshInstall(completedAtMs: number | null, nowMs: number): FreshInstallVerdict {
  if (completedAtMs === null || !Number.isFinite(completedAtMs) || completedAtMs <= 0) {
    return { fresh: false, reason: 'no_timestamp', ageMs: null, firstEntryMs: null };
  }
  const ageMs = nowMs - completedAtMs;
  if (ageMs < -FRESH_INSTALL_CLOCK_SKEW_TOLERANCE_MS) return { fresh: false, reason: 'clock_skew', ageMs, firstEntryMs: null };
  if (ageMs < FRESH_INSTALL_ANNOUNCEMENT_WINDOW_MS) return { fresh: true, reason: 'recent', ageMs, firstEntryMs: completedAtMs };
  return { fresh: false, reason: 'old', ageMs, firstEntryMs: completedAtMs };
}

/**
 * Окно «от команды» по сообщению, созданному в createdAtMs (владелец 22.10). Порядок:
 * 1) новичок (< 48 ч от первого входа) — окна нет, сообщение тихо во «Входящих»;
 * 2) рассылка/объявление, созданные ДО первого входа, — окном никогда (иначе на третий день новичку пачка старых объявлений);
 *    без даты создания у такого человека — тоже нет (не доказано, что новее);
 * 3) иначе — окно. Нет отметки первого входа (прежний пользователь) — правила 1–2 не действуют.
 * Личное сообщение команды — только правило 1 (пишется одному человеку, «пачки старых» нет).
 */
export type TeamModalDecision = 'show' | 'skip_new_user_48h' | 'skip_created_before_first_entry';
export function decideTeamModal(
  input: Readonly<{ verdict: FreshInstallVerdict; createdAtMs: number | null; personal: boolean }>,
): TeamModalDecision {
  if (input.verdict.fresh) return 'skip_new_user_48h';
  const firstEntryMs = input.verdict.firstEntryMs ?? null;
  if (input.personal || firstEntryMs === null) return 'show';
  if (input.createdAtMs === null || !Number.isFinite(input.createdAtMs) || input.createdAtMs <= firstEntryMs) {
    return 'skip_created_before_first_entry';
  }
  return 'show';
}

/** Лог решения окна: одна строка на сообщение, без uid. */
export function logTeamModalDecision(
  surface: 'announcement' | 'personal' | 'broadcast',
  id: string,
  createdAtMs: number | null,
  verdict: FreshInstallVerdict,
  decision: TeamModalDecision,
): void {
  console.log('[INBOX-MODAL]', JSON.stringify({ surface, id, createdAtMs, firstEntryMs: verdict.firstEntryMs ?? null, ageMs: verdict.ageMs, verdictReason: verdict.reason, decision })); // guard-ok: одна строка на решение окна
}

/** Очередь объявлений без созданных до первого входа (новичка отсекает skipAnnouncementsForFreshInstall). */
export function skipAnnouncementsCreatedBeforeFirstEntry<T extends Readonly<{ id: string; createdAtMs: number; createdAtKnown?: boolean }>>(
  queue: T[],
  verdict: FreshInstallVerdict,
): T[] {
  if (queue.length === 0) return queue;
  return queue.filter((message) => {
    const createdAtMs = message.createdAtKnown === false ? null : message.createdAtMs;
    const decision = decideTeamModal({ verdict, createdAtMs, personal: false });
    logTeamModalDecision('announcement', message.id, createdAtMs, verdict, decision);
    return decision === 'show';
  });
}

/** Прочитать отметку и вынести вердикт. Сбой чтения — не новичок (объявления показываются как раньше), причина в логе. */
export async function readFreshInstallVerdict(nowMs: number = Date.now()): Promise<FreshInstallVerdict> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDING_COMPLETED_AT_KEY);
    const parsed = raw === null ? null : Number(raw);
    const verdict = judgeFreshInstall(parsed, nowMs);
    console.log(`[APP-MESSAGE] fresh_install verdict fresh=${String(verdict.fresh)} reason=${verdict.reason} ageMs=${String(verdict.ageMs)} raw=${String(raw)}`); // guard-ok: единичный лог на вход
    return verdict;
  } catch (error) {
    console.warn(`[APP-MESSAGE] fresh_install read_failed ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch пишет причину
    return { fresh: false, reason: 'read_failed', ageMs: null, firstEntryMs: null };
  }
}

/**
 * Очередь модальных объявлений с учётом свежей установки: у новичка — пусто (с логом причины), иначе очередь как есть.
 * Чистая функция (вердикт приходит снаружи), поэтому тестируется без хранилища.
 */
export function skipAnnouncementsForFreshInstall<T extends Readonly<{ id: string }>>(
  queue: T[],
  verdict: FreshInstallVerdict,
): T[] {
  if (!verdict.fresh || queue.length === 0) return queue;
  console.log(`[APP-MESSAGE] skip reason=fresh_install count=${queue.length} ids=${queue.map((m) => m.id).join(',')} ageMs=${String(verdict.ageMs)}`); // guard-ok: пропуск пишет причину
  return [];
}
