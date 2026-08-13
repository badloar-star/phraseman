import AsyncStorage from '@react-native-async-storage/async-storage';

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
  taskIds?: Record<string, { xp: number; phrases: number }>;
};

type LedgerMap = Record<string, PlanXpLedgerEntry>;

async function readLedger(): Promise<LedgerMap> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Add XP + phrases to a plan instance's ledger. Optional task id makes the write idempotent. */
export async function bumpPlanXpLedger(
  planInstanceId: string,
  xp: number,
  phrases: number,
  planTaskId?: string,
): Promise<boolean> {
  const id = planInstanceId.trim();
  if (!id) return false;
  try {
    const ledger = await readLedger();
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
          [taskKey]: { xp: safeXp, phrases: safePhrases },
        },
      };
      await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
      return true;
    }
    ledger[id] = {
      xp: current.xp + safeXp,
      phrases: current.phrases + safePhrases,
    };
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
    return true;
  } catch {
    // best-effort
    return false;
  }
}

/** Read a plan instance's accumulated XP + phrases (zeros if none). */
export async function readPlanXpLedger(planInstanceId: string): Promise<PlanXpLedgerEntry> {
  const ledger = await readLedger();
  return ledger[planInstanceId.trim()] ?? { xp: 0, phrases: 0 };
}
