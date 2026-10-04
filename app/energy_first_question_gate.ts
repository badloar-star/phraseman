/**
 * Единый гейт списания энергии «в момент показа первого вопроса».
 *
 * зачем: D72 — энергия за урок/экзамен/занятие списывается в МОМЕНТ ПОКАЗА
 * ПЕРВОГО ВОПРОСА (не при открытии экрана, не при первом ответе).
 * D87 — если после списания первый вопрос так и не показан (падение, нет сети,
 * урок не загрузился, экран закрылся раньше) — энергия возвращается сама.
 * PM-084-A2 — prefetch / preview / remount / retry НЕ списывают повторно:
 * одна попытка = один стабильный operationId, повторные вызовы получают тот же
 * результат из реестра процесса, а реестр операций энергии (ledger) сам по себе
 * идемпотентен по operationId.
 * D67 — повторный вход в незавершённое занятие = НОВАЯ попытка (новый
 * operationId), поэтому снова 1.
 * D07 — Plus не расходует энергию: EnergyContext возвращает 'unlimited' без
 * списания, гейт это только протоколирует.
 *
 * Модуль без React: экраны пользуются хуком hooks/useFirstQuestionEnergyGate.ts,
 * а здесь живёт логика, которую можно проверить юнит-тестом.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ENERGY_FREE_REENTRY_WINDOW_MS, type EnergyActivityKey } from './energy_contract';

export type FirstQuestionChargeResult = 'spent' | 'unlimited' | 'cancelled' | 'insufficient';

export type FirstQuestionGateIntent = Readonly<{
  operationId: string;
  grant: Readonly<{ kind: string; subjectId: string; attemptId: string }>;
}>;

/** Статус операции в реестре энергии (подмножество EnergySessionStartStatus). */
export type FirstQuestionLedgerStatus =
  | 'missing' | 'prepared' | 'charged' | 'refunded' | 'acknowledged' | 'stale_account' | 'unavailable';

export type FirstQuestionGateDeps = Readonly<{
  confirmActivityStart: (activity: EnergyActivityKey, intent: FirstQuestionGateIntent) => Promise<FirstQuestionChargeResult>;
  refundActivityStart: (operationId: string, reason: string) => Promise<void>;
  acknowledgeSessionStart: (operationId: string) => Promise<boolean>;
  /** Владелец энергии (stableId аккаунта); null — аккаунт ещё не активен. */
  getOwnerId: () => string | null;
}>;

export type FirstQuestionRecoveryDeps = FirstQuestionGateDeps & Readonly<{
  readStartStatus: (operationId: string) => Promise<FirstQuestionLedgerStatus>;
}>;

type GateStatus = 'charging' | 'charged' | 'shown' | 'refunding' | 'refunded' | 'unlimited' | 'free_reentry';

/**
 * Когда списание становится окончательным. 'shown' — D72: при показе первого вопроса (по умолчанию).
 * 'first_answer' — D159 (урок, «Словарь», «Глаголы»): только после первого ответа; вышел без ответа → возврат.
 */
export type FirstQuestionFinalizeOn = 'shown' | 'first_answer';

type GateEntry = {
  status: GateStatus;
  activity: EnergyActivityKey;
  screen: string;
  promise: Promise<FirstQuestionChargeResult>;
  shownRequested: boolean;
  abortReason: string | null;
  finalizeOn: FirstQuestionFinalizeOn;
  answerRequested: boolean;
  reentryKey: string | null;
  owner: string | null;
};

export const FIRST_QUESTION_GATE_PENDING_KEY = 'energy_first_question_gate_pending_v1';
/** D159: время последнего выхода из раздела урока (ключ «activity:subject») — для бесплатного повторного входа. */
export const FREE_REENTRY_EXITS_KEY = 'energy_free_reentry_exits_v1';

type FreeReentryExits = Readonly<{ owner: string; exits: Readonly<Record<string, number>> }>;

async function readFreeReentryExits(owner: string): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(FREE_REENTRY_EXITS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<FreeReentryExits>;
    if (parsed?.owner !== owner || !parsed.exits || typeof parsed.exits !== 'object') return {};
    return { ...parsed.exits };
  } catch (error) {
    warn('free_reentry: exits read failed — charging normally', error);
    return {};
  }
}

async function writeFreeReentryExit(owner: string, key: string, exitAtMs: number): Promise<void> {
  try {
    const current = await readFreeReentryExits(owner);
    // Старые выходы за окном не нужны — храним только живые.
    const live = Object.fromEntries(Object.entries(current).filter(([, at]) => exitAtMs - at < ENERGY_FREE_REENTRY_WINDOW_MS));
    await AsyncStorage.setItem(FREE_REENTRY_EXITS_KEY, JSON.stringify({ owner, exits: { ...live, [key]: exitAtMs } }));
  } catch (error) {
    warn(`free_reentry: exit write failed key=${key}`, error);
  }
}
const LOG = '[ENERGY-GATE]';

type PendingRecord = Readonly<{
  operationId: string;
  activity: string;
  owner: string;
  bootId: string;
  chargedAtMs: number;
}>;

// Один идентификатор на процесс: записи с ДРУГИМ bootId — это «списано, но вопрос
// так и не показан» из прошлого запуска (приложение упало/было убито).
const PROCESS_BOOT_ID = `boot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const registry = new Map<string, GateEntry>();
let journalChain: Promise<void> = Promise.resolve();
let recoveryPromise: Promise<number> | null = null;

function log(message: string): void {
  console.log(`${LOG} ${message}`);
}

function warn(message: string, error?: unknown): void {
  const detail = error === undefined ? '' : ` error=${error instanceof Error ? error.message : String(error)}`;
  console.warn(`${LOG} ${message}${detail}`);
}

function parseJournal(raw: string | null): PendingRecord[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      warn(`journal: not an array, dropping (type=${typeof parsed})`);
      return [];
    }
    return parsed.filter((item): item is PendingRecord => Boolean(
      item && typeof item === 'object'
      && typeof (item as PendingRecord).operationId === 'string'
      && typeof (item as PendingRecord).owner === 'string'
      && typeof (item as PendingRecord).bootId === 'string',
    ));
  } catch (error) {
    warn('journal: corrupt JSON, dropping', error);
    return [];
  }
}

/** Все записи журнала идут одной очередью: иначе параллельные экраны теряли бы записи. */
function mutateJournal(mutator: (records: PendingRecord[]) => PendingRecord[]): Promise<void> {
  const next = journalChain.then(async () => {
    try {
      const current = parseJournal(await AsyncStorage.getItem(FIRST_QUESTION_GATE_PENDING_KEY));
      const updated = mutator(current);
      if (updated.length === 0) await AsyncStorage.removeItem(FIRST_QUESTION_GATE_PENDING_KEY);
      else await AsyncStorage.setItem(FIRST_QUESTION_GATE_PENDING_KEY, JSON.stringify(updated));
    } catch (error) {
      // Журнал — страховка на случай падения. Его отказ не должен ломать урок:
      // в пределах живого процесса возврат всё равно делает реестр в памяти.
      warn('journal: write failed', error);
    }
  });
  journalChain = next;
  return next;
}

function addPending(record: PendingRecord): Promise<void> {
  return mutateJournal((records) => [
    ...records.filter((item) => item.operationId !== record.operationId),
    record,
  ]);
}

function removePending(operationId: string): Promise<void> {
  return mutateJournal((records) => records.filter((item) => item.operationId !== operationId));
}

async function acknowledge(deps: FirstQuestionGateDeps, operationId: string, entry: GateEntry): Promise<void> {
  entry.status = 'shown';
  try {
    const acked = await deps.acknowledgeSessionStart(operationId);
    log(`shown: op=${operationId} screen=${entry.screen} ack=${String(acked)}`);
  } catch (error) {
    // Ack — метаданные: списание уже durable. Главное — снять запись журнала,
    // чтобы старт приложения не вернул энергию за реально показанный вопрос.
    warn(`shown: ack threw op=${operationId}`, error);
  }
  await removePending(operationId);
}

async function refund(deps: FirstQuestionGateDeps, operationId: string, entry: GateEntry, reason: string): Promise<void> {
  entry.status = 'refunding';
  try {
    await deps.refundActivityStart(operationId, reason);
    entry.status = 'refunded';
    log(`refund: op=${operationId} screen=${entry.screen} reason=${reason} -> refunded`);
    await removePending(operationId);
  } catch (error) {
    // Запись журнала ОСТАЁТСЯ: следующий старт приложения повторит возврат
    // (реестр идемпотентен по operationId, двойного возврата не будет).
    entry.status = 'charged';
    warn(`refund: failed op=${operationId} reason=${reason}; journal keeps it for next boot`, error);
  }
}

/**
 * Списать энергию за показ первого вопроса. Повторный вызов с тем же
 * operationId (remount / retry / prefetch / двойной тап) возвращает ТОТ ЖЕ
 * результат и второй раз ничего не списывает.
 */
export function chargeFirstQuestion(
  deps: FirstQuestionGateDeps,
  input: Readonly<{
    activity: EnergyActivityKey;
    intent: FirstQuestionGateIntent;
    screen: string;
    /** D159: 'first_answer' — окончательно после первого ответа, плюс бесплатный повторный вход. */
    finalizeOn?: FirstQuestionFinalizeOn;
  }>,
): Promise<FirstQuestionChargeResult> {
  const { activity, intent, screen } = input;
  const finalizeOn: FirstQuestionFinalizeOn = input.finalizeOn ?? 'shown';
  const operationId = intent.operationId;
  const existing = registry.get(operationId);
  if (existing) {
    log(`charge: dedup op=${operationId} screen=${screen} status=${existing.status} (no second charge)`);
    return existing.promise;
  }
  log(`charge: start op=${operationId} activity=${activity} screen=${screen} subject=${intent.grant.subjectId}`);
  const entry: GateEntry = {
    status: 'charging',
    activity,
    screen,
    shownRequested: false,
    abortReason: null,
    finalizeOn,
    answerRequested: false,
    reentryKey: finalizeOn === 'first_answer' ? `${activity}:${intent.grant.subjectId}` : null,
    owner: null,
    promise: Promise.resolve('cancelled'),
  };
  registry.set(operationId, entry);
  const startedAt = Date.now();
  entry.promise = (async (): Promise<FirstQuestionChargeResult> => {
    entry.owner = deps.getOwnerId();
    // D159: повторный вход в тот же раздел урока в окне после выхода — продолжение, не новое занятие.
    if (entry.reentryKey && entry.owner) {
      const exits = await readFreeReentryExits(entry.owner);
      const exitAt = exits[entry.reentryKey];
      const windowLeftMs = exitAt === undefined ? -1 : ENERGY_FREE_REENTRY_WINDOW_MS - (Date.now() - exitAt);
      if (windowLeftMs > 0) {
        entry.status = 'free_reentry';
        log(`free_reentry: op=${operationId} key=${entry.reentryKey} window_left_ms=${windowLeftMs} — nothing spent`);
        return 'unlimited';
      }
      log(`free_reentry: none op=${operationId} key=${entry.reentryKey} lastExitAgoMs=${exitAt === undefined ? 'none' : Date.now() - exitAt}`);
    }
    let result: FirstQuestionChargeResult;
    try {
      result = await deps.confirmActivityStart(activity, intent);
    } catch (error) {
      warn(`charge: confirmActivityStart threw op=${operationId}`, error);
      result = 'cancelled';
    }
    log(`charge: result op=${operationId} result=${result} tookMs=${Date.now() - startedAt}`);
    if (result === 'unlimited') {
      entry.status = 'unlimited';
      log(`charge: Plus/unlimited — nothing spent op=${operationId}`);
      return result;
    }
    if (result !== 'spent') {
      // Не списано — попытка не состоялась. Убираем из реестра, чтобы
      // пополнивший энергию человек мог начать снова тем же входом.
      registry.delete(operationId);
      log(`charge: not spent op=${operationId} result=${result} — entry cleared`);
      return result;
    }
    entry.status = 'charged';
    const owner = deps.getOwnerId();
    if (owner) {
      await addPending({ operationId, activity, owner, bootId: PROCESS_BOOT_ID, chargedAtMs: Date.now() });
    } else {
      warn(`charge: no owner id, journal skipped op=${operationId}`);
    }
    if (entry.abortReason) {
      log(`charge: abort requested while charging op=${operationId} reason=${entry.abortReason}`);
      await refund(deps, operationId, entry, entry.abortReason);
      return result;
    }
    if (entry.finalizeOn === 'first_answer') {
      if (entry.answerRequested) await acknowledge(deps, operationId, entry);
      else if (entry.shownRequested) log(`shown: op=${operationId} screen=${screen} — refundable until first answer (D159)`);
      return result;
    }
    if (entry.shownRequested) await acknowledge(deps, operationId, entry);
    return result;
  })();
  return entry.promise;
}

/** Первый вопрос реально на экране: подтверждаем старт, возврата больше не будет. */
export async function markFirstQuestionShown(
  deps: FirstQuestionGateDeps,
  operationId: string,
): Promise<void> {
  const entry = registry.get(operationId);
  if (!entry) {
    log(`shown: skip op=${operationId} reason=no-entry (not charged or cleared)`);
    return;
  }
  if (entry.status === 'charging') {
    entry.shownRequested = true;
    log(`shown: queued until charge resolves op=${operationId}`);
    return;
  }
  if (entry.status !== 'charged') {
    log(`shown: skip op=${operationId} reason=status-${entry.status}`);
    return;
  }
  if (entry.finalizeOn === 'first_answer') {
    // D159: показ не финализирует — запись журнала остаётся до первого ответа.
    log(`shown: op=${operationId} screen=${entry.screen} — refundable until first answer (D159)`);
    return;
  }
  await acknowledge(deps, operationId, entry);
}

/**
 * D159: первый ответ дан — списание окончательное (подтверждаем старт, снимаем запись журнала).
 * Повторные вызовы безопасны: после подтверждения статус 'shown'.
 */
export async function markFirstAnswerGiven(
  deps: FirstQuestionGateDeps,
  operationId: string,
): Promise<void> {
  const entry = registry.get(operationId);
  if (!entry) {
    log(`answer: skip op=${operationId} reason=no-entry`);
    return;
  }
  if (entry.status === 'charging') {
    entry.answerRequested = true;
    log(`answer: queued until charge resolves op=${operationId}`);
    return;
  }
  if (entry.status !== 'charged') {
    if (entry.status !== 'shown') log(`answer: skip op=${operationId} reason=status-${entry.status}`);
    return;
  }
  log(`answer: first answer op=${operationId} screen=${entry.screen} — charge is final`);
  await acknowledge(deps, operationId, entry);
}

/**
 * D159: выход из раздела урока. Если энергия за сессию осталась списанной (был ответ) или сама сессия была
 * бесплатным продолжением — запоминаем время выхода: повторный вход в окне будет бесплатным.
 * Сессия, за которую энергию вернули, окно НЕ открывает (иначе «вошёл-вышел» = бесконечные бесплатные входы).
 */
export async function noteFirstQuestionSessionExit(operationId: string): Promise<void> {
  const entry = registry.get(operationId);
  if (!entry || !entry.reentryKey || !entry.owner) return;
  if (entry.status !== 'shown' && entry.status !== 'free_reentry') {
    log(`exit: no free window op=${operationId} key=${entry.reentryKey} status=${entry.status}`);
    return;
  }
  log(`exit: free window opened op=${operationId} key=${entry.reentryKey} windowMs=${ENERGY_FREE_REENTRY_WINDOW_MS}`);
  await writeFreeReentryExit(entry.owner, entry.reentryKey, Date.now());
}

/**
 * Первый вопрос так и не показан (ошибка загрузки, падение, уход с экрана) —
 * вернуть энергию. Уже показанный вопрос не возвращается никогда.
 */
export async function refundIfFirstQuestionNotShown(
  deps: FirstQuestionGateDeps,
  operationId: string,
  reason: string,
): Promise<void> {
  const entry = registry.get(operationId);
  if (!entry) {
    log(`refund: skip op=${operationId} reason=${reason} why=no-entry`);
    return;
  }
  if (entry.status === 'charging') {
    entry.abortReason = reason;
    log(`refund: deferred until charge resolves op=${operationId} reason=${reason}`);
    return;
  }
  if (entry.status !== 'charged') {
    log(`refund: skip op=${operationId} reason=${reason} why=status-${entry.status}`);
    return;
  }
  // D159: в режиме first_answer сюда попадаем только без единого ответа (ответ снял бы статус charged).
  await refund(deps, operationId, entry, entry.finalizeOn === 'first_answer' ? `no_answer:${reason}` : reason);
}

/** Текущее состояние попытки (для логов и тестов). */
export function readFirstQuestionGateStatus(operationId: string): GateStatus | 'none' {
  return registry.get(operationId)?.status ?? 'none';
}

/**
 * При старте приложения: «списано, но вопрос не показан» из ПРОШЛОГО запуска →
 * возврат. Идемпотентно: реестр энергии не вернёт одну операцию дважды, а
 * подтверждённые (acknowledged) операции только снимаются с журнала.
 * Выполняется один раз на процесс.
 */
export function recoverUnshownFirstQuestionCharges(deps: FirstQuestionRecoveryDeps): Promise<number> {
  if (recoveryPromise) return recoveryPromise;
  recoveryPromise = (async () => {
    const owner = deps.getOwnerId();
    if (!owner) {
      log('recovery: skip — no active account yet (will retry on next call)');
      recoveryPromise = null;
      return 0;
    }
    let records: PendingRecord[];
    try {
      await journalChain;
      records = parseJournal(await AsyncStorage.getItem(FIRST_QUESTION_GATE_PENDING_KEY));
    } catch (error) {
      warn('recovery: journal read failed', error);
      recoveryPromise = null;
      return 0;
    }
    const stale = records.filter((item) => item.bootId !== PROCESS_BOOT_ID && item.owner === owner);
    log(`recovery: journal=${records.length} staleForOwner=${stale.length} boot=${PROCESS_BOOT_ID}`);
    let refunded = 0;
    for (const record of stale) {
      let status: FirstQuestionLedgerStatus;
      try {
        status = await deps.readStartStatus(record.operationId);
      } catch (error) {
        warn(`recovery: status read failed op=${record.operationId}, kept`, error);
        continue;
      }
      if (status === 'charged') {
        try {
          await deps.refundActivityStart(record.operationId, 'first_question_never_shown_recovery');
          refunded += 1;
          log(`recovery: refunded op=${record.operationId} activity=${record.activity}`);
          await removePending(record.operationId);
        } catch (error) {
          warn(`recovery: refund failed op=${record.operationId}, kept for next boot`, error);
        }
        continue;
      }
      if (status === 'unavailable' || status === 'stale_account' || status === 'prepared') {
        // prepared доводит сам реестр при загрузке; unavailable/stale — не трогаем.
        log(`recovery: keep op=${record.operationId} status=${status}`);
        continue;
      }
      log(`recovery: drop op=${record.operationId} status=${status} (nothing to refund)`);
      await removePending(record.operationId);
    }
    log(`recovery: done refunded=${refunded}`);
    return refunded;
  })();
  return recoveryPromise;
}

/** Только для тестов: сбросить состояние процесса. */
export function __resetFirstQuestionGateForTests(): void {
  registry.clear();
  journalChain = Promise.resolve();
  recoveryPromise = null;
}

/** Только для тестов: bootId текущего процесса. */
export function __firstQuestionGateBootIdForTests(): string {
  return PROCESS_BOOT_ID;
}
