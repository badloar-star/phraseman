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

/** Add XP + phrases to a plan instance's ledger. */
export async function bumpPlanXpLedger(
  planInstanceId: string,
  xp: number,
  phrases: number,
): Promise<void> {
  const id = planInstanceId.trim();
  if (!id) return;
  try {
    const ledger = await readLedger();
    const current = ledger[id] ?? { xp: 0, phrases: 0 };
    ledger[id] = {
      xp: current.xp + Math.max(0, Math.floor(xp)),
      phrases: current.phrases + Math.max(0, Math.floor(phrases)),
    };
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    // best-effort
  }
}

/** Read a plan instance's accumulated XP + phrases (zeros if none). */
export async function readPlanXpLedger(planInstanceId: string): Promise<PlanXpLedgerEntry> {
  const ledger = await readLedger();
  return ledger[planInstanceId.trim()] ?? { xp: 0, phrases: 0 };
}
