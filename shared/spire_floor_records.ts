/** Competitive floor attempts are separate from ordinary progress and economy. */
export const FLOOR_RECORD_VERSION = 'floor-record-v1';
/** Separate namespace: legacy floor records never become step-one records. */
export const STEP_RECORD_VERSION = 'step-record-v2';
export const FLOOR_RECORD_MAX_MS = 30 * 60_000;
export type FloorRecord = Readonly<{ uid: string; durationMs: number; completedAtMs: number }>;
export type FloorRecordSnapshot = Readonly<{
  records: Readonly<Record<string, FloorRecord>>;
  personal: Readonly<Record<string, FloorRecord>>;
}>;
export type StepRecordReceipt = Readonly<{
  version: typeof STEP_RECORD_VERSION; uid: string; groupId: string; weekId: string;
  floor: number; step: number; packHash: string; token: string;
  lang: string; tier: number; taskIds: readonly string[];
  durationMs: number; completedAtMs: number; correctCount: 10;
  recordSet: boolean; personalBestSet: boolean;
}>;
export type RecordAnswer = Readonly<{ selectedIndex: number }> |
  Readonly<{ tokens: readonly string[] }> | Readonly<{ selectedIndexes: readonly number[] }>;

export function stepRecordKey(floor: unknown, step: unknown): string | null {
  if (typeof floor !== 'number' || typeof step !== 'number' || !Number.isInteger(floor)
    || !Number.isInteger(step) || floor < 1 || floor > 15 || step < 1
    || step > (floor <= 5 ? floor + 4 : 10)) return null;
  return `${floor}:${step}`;
}

export function stepRecordChallengeSet<T>(pack: Readonly<{
  floors: readonly Readonly<{ floor: number; steps: readonly Readonly<{ step: number; sets: readonly T[] }>[] }>[];
}>, floor: number, step: number): T | null {
  if (!stepRecordKey(floor, step)) return null;
  return pack.floors.find((row) => row.floor === floor)?.steps.find((row) => row.step === step)?.sets[0] ?? null;
}

export function chooseFloorRecord(current: FloorRecord | null, candidate: FloorRecord): FloorRecord {
  return !current || candidate.durationMs < current.durationMs ? candidate : current;
}

/** Fixed first set of the floor's first step: no uid, attempt or random seed. */
export function recordChallengeSet<T>(pack: Readonly<{
  floors: readonly Readonly<{ floor: number; steps: readonly Readonly<{ step: number; sets: readonly T[] }>[] }>[];
  aboveCloudsCyclesFloors: readonly number[];
}>, floor: number): T | null {
  if (!Number.isInteger(floor) || floor < 1 || floor > 10000) return null;
  const mapped = floor <= 15 ? floor : pack.aboveCloudsCyclesFloors[(floor - 16) % pack.aboveCloudsCyclesFloors.length];
  return pack.floors.find((row) => row.floor === mapped)?.steps.find((row) => row.step === 1)?.sets[0] ?? null;
}

/** Same FNV fingerprint wire format as arena/answer_check; covered by parity tests. */
function fingerprint(salt: string, taskId: string, value: unknown): string {
  const canonical = Array.isArray(value) ? value.map((v) => String(v).trim()).join('\u0001') : String(value ?? '').trim();
  const seed = `${salt}|${taskId}|${canonical}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

export function recordAnswerCorrect(salt: string, task: Readonly<{ taskId: string; kind: string }>, expected: readonly string[], raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || !expected.length) return false;
  const answer = raw as Record<string, unknown>;
  if (task.kind === 'choice' || task.kind === 'listen') {
    return Number.isInteger(answer.selectedIndex) && expected[0] === fingerprint(salt, task.taskId, answer.selectedIndex);
  }
  if (task.kind === 'translate' || task.kind === 'dictate') {
    return Array.isArray(answer.tokens) && answer.tokens.length <= 100 &&
      answer.tokens.every((v) => typeof v === 'string' && v.length <= 200) &&
      expected[0] === fingerprint(salt, task.taskId, answer.tokens);
  }
  if (task.kind !== 'match' && task.kind !== 'timeattack') return false;
  return Array.isArray(answer.selectedIndexes) && answer.selectedIndexes.length === expected.length &&
    answer.selectedIndexes.every((v, i) => Number.isInteger(v) && expected[i] === fingerprint(salt, task.taskId, v));
}

export function recordTime(ms: number): string {
  const centiseconds = Math.floor(ms / 10);
  return `${Math.floor(centiseconds / 6000)}:${String(Math.floor(centiseconds / 100) % 60).padStart(2, '0')}.${String(centiseconds % 100).padStart(2, '0')}`;
}
