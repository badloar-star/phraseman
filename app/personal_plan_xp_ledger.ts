import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration, type AccountGenerationToken } from './account_generation';

/**
 * Per-plan XP/phrase ledger.
 *
 * registerXP feeds the global economy but does not record "how much of this came from
 * the plan". This small local ledger accumulates XP and phrases earned within a plan
 * instance so the plan stats screen can show the learner what THIS plan gave them.
 * Best-effort, never blocks task flow.
 */

const LEDGER_KEY = 'personal_plan_xp_ledger_v1';

export type PlanXpLedgerEntry = {
  xp: number;
  phrases: number;
  taskIds?: Record<string, PlanXpTaskReceipt>;
};

export type PlanXpTaskReceipt = {
  xp: number;
  phrases: number;
  /** Missing on legacy receipts; legacy entries are treated as already applied. */
  status?: 'pending' | 'applied';
  /** Stable registerXP id used for every retry of this task. */
  eventId?: string;
};

export type PlanXpReservation = {
  shouldRegister: boolean;
  eventId: string;
};

type LedgerMap = Record<string, PlanXpLedgerEntry>;
let ledgerWriteQueue: Promise<void> = Promise.resolve();

async function readLedger(): Promise<LedgerMap> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export async function withPlanXpLedgerStorageLock<T>(work: () => Promise<T>): Promise<T> {
  let result!: T;
  const write = ledgerWriteQueue.then(async () => { result = await work(); });
  ledgerWriteQueue = write.catch(() => undefined);
  await write;
  return result;
}

function sameAccountGeneration(left: AccountGenerationToken, right: AccountGenerationToken): boolean {
  return left.generation === right.generation && left.stableId === right.stableId && left.phase === right.phase;
}

async function removeStaleLedgerWrite(): Promise<void> {
  await AsyncStorage.removeItem(LEDGER_KEY).catch(() => {});
}

/**
 * Persist a retryable task receipt before calling registerXP. Pending receipts do
 * not contribute to totals. A retry reuses the exact same event id, while an
 * applied (including legacy) receipt is terminal and cannot award twice.
 */
export async function reservePlanXpTask(
  planInstanceId: string,
  planTaskId: string,
  xp: number,
  phrases: number,
  eventId: string,
  operationAccount: AccountGenerationToken = captureAccountGeneration(),
): Promise<PlanXpReservation | null> {
  const id = planInstanceId.trim();
  const taskKey = planTaskId.trim();
  const stableEventId = eventId.trim();
  if (!id || !taskKey || !stableEventId) return null;
  try {
    return await withPlanXpLedgerStorageLock(async () => {
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
      const ledger = await readLedger();
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
      const current = ledger[id] ?? { xp: 0, phrases: 0 };
      const taskIds = current.taskIds ?? {};
      const existing = taskIds[taskKey];
      if (existing) {
        if (existing.status !== 'pending') {
          return { shouldRegister: false, eventId: existing.eventId || stableEventId };
        }
        return { shouldRegister: true, eventId: existing.eventId || stableEventId };
      }
      taskIds[taskKey] = {
        xp: Math.max(0, Math.floor(xp)),
        phrases: Math.max(0, Math.floor(phrases)),
        status: 'pending',
        eventId: stableEventId,
      };
      ledger[id] = { ...current, taskIds };
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return null;
      await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
        await removeStaleLedgerWrite();
        return null;
      }
      return { shouldRegister: true, eventId: stableEventId };
    });
  } catch {
    return null;
  }
}

/** Finalize a successfully registered task once; totals are derived only from applied receipts. */
export async function commitPlanXpTask(
  planInstanceId: string,
  planTaskId: string,
  operationAccount: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  const id = planInstanceId.trim();
  const taskKey = planTaskId.trim();
  if (!id || !taskKey) return false;
  try {
    return await withPlanXpLedgerStorageLock(async () => {
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      const ledger = await readLedger();
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      const current = ledger[id] ?? { xp: 0, phrases: 0 };
      const taskIds = current.taskIds ?? {};
      const receipt = taskIds[taskKey];
      if (!receipt || receipt.status !== 'pending') return false;
      const applied: PlanXpTaskReceipt = { ...receipt, status: 'applied' };
      ledger[id] = {
        xp: Math.max(0, Math.floor(current.xp)) + applied.xp,
        phrases: Math.max(0, Math.floor(current.phrases)) + applied.phrases,
        taskIds: { ...taskIds, [taskKey]: applied },
      };
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
        await removeStaleLedgerWrite();
        return false;
      }
      return true;
    });
  } catch {
    return false;
  }
}

/** Add XP + phrases to a plan instance's ledger. Optional task id makes the write idempotent. */
export async function bumpPlanXpLedger(
  planInstanceId: string,
  xp: number,
  phrases: number,
  planTaskId?: string,
  operationAccount: AccountGenerationToken = captureAccountGeneration(),
): Promise<boolean> {
  const id = planInstanceId.trim();
  if (!id) return false;
  try {
    return await withPlanXpLedgerStorageLock(async () => {
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      const ledger = await readLedger();
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      const current = ledger[id] ?? { xp: 0, phrases: 0 };
      const safeXp = Math.max(0, Math.floor(xp));
      const safePhrases = Math.max(0, Math.floor(phrases));
      const taskKey = planTaskId?.trim();
      if (taskKey) {
        const taskIds = current.taskIds ?? {};
        if (taskIds[taskKey]) return false;
        ledger[id] = {
          xp: current.xp + safeXp,
          phrases: current.phrases + safePhrases,
          taskIds: {
            ...taskIds,
            [taskKey]: { xp: safeXp, phrases: safePhrases, status: 'applied' },
          },
        };
        if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
        await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
        if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
          await removeStaleLedgerWrite();
          return false;
        }
        return true;
      }
      ledger[id] = {
        xp: current.xp + safeXp,
        phrases: current.phrases + safePhrases,
      };
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return false;
      await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) {
        await removeStaleLedgerWrite();
        return false;
      }
      return true;
    });
  } catch {
    // best-effort
    return false;
  }
}

/** Read a plan instance's accumulated XP + phrases (zeros if none). */
export async function readPlanXpLedger(planInstanceId: string): Promise<PlanXpLedgerEntry> {
  const operationAccount = captureAccountGeneration();
  const ledger = await readLedger();
  if (!sameAccountGeneration(operationAccount, captureAccountGeneration())) return { xp: 0, phrases: 0 };
  return ledger[planInstanceId.trim()] ?? { xp: 0, phrases: 0 };
}
