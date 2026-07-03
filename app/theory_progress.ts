type StoredTheoryProgress = {
  seen?: unknown;
  open?: unknown;
  total?: unknown;
  drills?: unknown;
  drillTotal?: unknown;
};

export type TheoryDrillProgressStatus = 'idle' | 'wrong' | 'answered' | 'solved';

export type TheoryDrillSlot = {
  word: string;
  bankId: string;
};

export type TheoryDrillProgressState = {
  type?: string;
  status?: TheoryDrillProgressStatus;
  picked?: string | null;
  answered?: string | null;
  pickedIndex?: number | null;
  slots?: Array<TheoryDrillSlot | null>;
  showWhy?: boolean;
  solved?: boolean;
  misses?: number;
  wrongSlot?: number | null;
};

function uniqueStrings(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || value.length === 0 || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

function safeTotal(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}

function safeNullableString(value: unknown): string | null | undefined {
  if (value == null) return value === null ? null : undefined;
  return typeof value === 'string' ? value : undefined;
}

function safeNullableIndex(value: unknown): number | null | undefined {
  if (value == null) return value === null ? null : undefined;
  return typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : undefined;
}

function sanitizeDrillSlots(value: unknown): Array<TheoryDrillSlot | null> | undefined {
  if (!Array.isArray(value)) return undefined;
  const slots: Array<TheoryDrillSlot | null> = [];
  for (const slot of value) {
    if (slot == null) {
      slots.push(null);
      continue;
    }
    if (typeof slot !== 'object') continue;
    const raw = slot as { word?: unknown; bankId?: unknown };
    if (typeof raw.word !== 'string' || typeof raw.bankId !== 'string') continue;
    slots.push({ word: raw.word, bankId: raw.bankId });
  }
  return slots;
}

function sanitizeDrillStatus(value: unknown): TheoryDrillProgressStatus | undefined {
  return value === 'idle' || value === 'wrong' || value === 'answered' || value === 'solved'
    ? value
    : undefined;
}

function sanitizeDrillState(value: unknown): TheoryDrillProgressState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const state: TheoryDrillProgressState = {};
  if (typeof raw.type === 'string') state.type = raw.type;
  const status = sanitizeDrillStatus(raw.status);
  if (status) state.status = status;
  const picked = safeNullableString(raw.picked);
  if (picked !== undefined) state.picked = picked;
  const answered = safeNullableString(raw.answered);
  if (answered !== undefined) state.answered = answered;
  const pickedIndex = safeNullableIndex(raw.pickedIndex);
  if (pickedIndex !== undefined) state.pickedIndex = pickedIndex;
  const wrongSlot = safeNullableIndex(raw.wrongSlot);
  if (wrongSlot !== undefined) state.wrongSlot = wrongSlot;
  const slots = sanitizeDrillSlots(raw.slots);
  if (slots) state.slots = slots;
  if (typeof raw.showWhy === 'boolean') state.showWhy = raw.showWhy;
  if (typeof raw.solved === 'boolean') state.solved = raw.solved;
  if (typeof raw.misses === 'number' && Number.isFinite(raw.misses)) state.misses = Math.max(0, Math.floor(raw.misses));
  return Object.keys(state).length > 0 ? state : null;
}

function sanitizeDrills(value: unknown, validDrillIds?: readonly string[]): Record<string, TheoryDrillProgressState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const validSet = validDrillIds ? new Set(validDrillIds) : null;
  const drills: Record<string, TheoryDrillProgressState> = {};
  for (const [id, rawState] of Object.entries(value as Record<string, unknown>)) {
    if (!id || (validSet && !validSet.has(id))) continue;
    const state = sanitizeDrillState(rawState);
    if (state) drills[id] = state;
  }
  return drills;
}

export function isTheoryDrillCompleted(state: TheoryDrillProgressState | null | undefined): boolean {
  return !!state && (state.status === 'solved' || state.status === 'answered' || state.solved === true);
}

export function countCompletedTheoryDrills(
  drills: Record<string, TheoryDrillProgressState>,
  validDrillIds?: readonly string[],
): number {
  const ids = validDrillIds ?? Object.keys(drills);
  return ids.reduce((count, id) => count + (isTheoryDrillCompleted(drills[id]) ? 1 : 0), 0);
}

export function parseTheorySeenProgress(
  raw: string | null | undefined,
  validSectionNums?: readonly string[],
  validDrillIds?: readonly string[],
): {
  seen: string[];
  open: string[];
  total: number;
  drills: Record<string, TheoryDrillProgressState>;
  drillTotal: number;
} {
  const validSet = validSectionNums ? new Set(validSectionNums) : null;
  const fallbackTotal = validSectionNums?.length ?? 0;
  const fallbackDrillTotal = validDrillIds?.length ?? 0;
  if (!raw) return { seen: [], open: [], total: fallbackTotal, drills: {}, drillTotal: fallbackDrillTotal };

  try {
    const parsed = JSON.parse(raw) as StoredTheoryProgress | unknown[];
    const rawSeen = Array.isArray(parsed)
      ? parsed
      : Array.isArray((parsed as StoredTheoryProgress)?.seen)
        ? ((parsed as StoredTheoryProgress).seen as unknown[])
        : [];
    const rawOpen = !Array.isArray(parsed) && Array.isArray((parsed as StoredTheoryProgress)?.open)
      ? ((parsed as StoredTheoryProgress).open as unknown[])
      : [];
    const seen = uniqueStrings(rawSeen).filter((num) => !validSet || validSet.has(num));
    const open = uniqueStrings(rawOpen).filter((num) => !validSet || validSet.has(num));
    const storedTotal = !Array.isArray(parsed)
      ? safeTotal((parsed as StoredTheoryProgress)?.total)
      : 0;
    const drills = !Array.isArray(parsed)
      ? sanitizeDrills((parsed as StoredTheoryProgress).drills, validDrillIds)
      : {};
    const storedDrillTotal = !Array.isArray(parsed)
      ? safeTotal((parsed as StoredTheoryProgress)?.drillTotal)
      : 0;
    return {
      seen,
      open,
      total: fallbackTotal || storedTotal,
      drills,
      drillTotal: fallbackDrillTotal || storedDrillTotal || Object.keys(drills).length,
    };
  } catch {
    return { seen: [], open: [], total: fallbackTotal, drills: {}, drillTotal: fallbackDrillTotal };
  }
}

export function serializeTheorySeenProgress(
  seen: Iterable<string>,
  total: number,
  open: Iterable<string> = [],
  drills: Record<string, TheoryDrillProgressState> = {},
  drillTotal = 0,
): string {
  return JSON.stringify({
    seen: uniqueStrings(Array.from(seen)),
    open: uniqueStrings(Array.from(open)),
    total: safeTotal(total),
    drills: sanitizeDrills(drills),
    drillTotal: safeTotal(drillTotal),
    updatedAt: Date.now(),
  });
}

export function theorySeenProgressPct(seenCount: number, total: number): number {
  const boundedTotal = safeTotal(total);
  const boundedSeen = safeTotal(seenCount);
  if (boundedTotal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((boundedSeen / boundedTotal) * 100)));
}

export function theoryOverallProgressPct(
  seenCount: number,
  sectionTotal: number,
  completedDrillCount: number,
  drillTotal: number,
): number {
  const boundedSectionTotal = safeTotal(sectionTotal);
  const boundedDrillTotal = safeTotal(drillTotal);
  const total = boundedSectionTotal + boundedDrillTotal;
  if (total <= 0) return 0;
  const done = Math.min(safeTotal(seenCount), boundedSectionTotal)
    + Math.min(safeTotal(completedDrillCount), boundedDrillTotal);
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
