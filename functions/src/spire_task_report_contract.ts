import {
  SPIRE_PACK_MAX_TIER,
  SPIRE_PACK_SCHEMA,
  spirePackHash,
  type SpirePack,
} from './spire_pack_contract';
import type { ArenaStudyTarget } from './arena_target_registry';
import { isSpireFlaggableStudyTarget, spireTaskIdBelongsToTarget } from './spire_task_flag_contract';

export type SpireTaskReportClaim = Readonly<{
  taskId: string;
  studyTarget: ArenaStudyTarget;
  weekId: string;
  tier: number;
  packHash: string;
  floor: number;
  step: number;
  setIndex: number;
  taskIndex: number;
  reason: string;
}>;

export type VerifiedSpireTaskClaim = SpireTaskReportClaim & Readonly<{
  mode: string;
  kind: string;
  difficulty: number;
}>;

type Row = Record<string, unknown>;

const WEEK_ID_RE = /^\d{4}-W(?:0[1-9]|[1-4]\d|5[0-3])$/u;
const PACK_HASH_RE = /^[A-Za-z0-9:_-]{8,128}$/u;

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function boundedInteger(value: unknown, min: number, max: number, error: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) throw new Error(error);
  return parsed;
}

export function parseSpireTaskReportClaim(value: unknown): SpireTaskReportClaim {
  const input = row(value);
  const taskId = String(input.taskId ?? '').trim();
  const studyTarget = String(input.studyTarget ?? '').trim();
  const weekId = String(input.weekId ?? '').trim();
  const packHash = String(input.packHash ?? '').trim();
  const reason = String(input.reason ?? '').trim().slice(0, 2000);
  if (!isSpireFlaggableStudyTarget(studyTarget)) throw new Error('spire_task_report_lang_invalid');
  if (!spireTaskIdBelongsToTarget(taskId, studyTarget)) throw new Error('spire_task_report_task_invalid');
  if (!WEEK_ID_RE.test(weekId)) throw new Error('spire_task_report_week_invalid');
  if (!PACK_HASH_RE.test(packHash)) throw new Error('spire_task_report_pack_hash_invalid');
  if (reason.length < 2) throw new Error('spire_task_report_reason_required');
  return Object.freeze({
    taskId,
    studyTarget,
    weekId,
    tier: boundedInteger(input.tier, 0, SPIRE_PACK_MAX_TIER, 'spire_task_report_tier_invalid'),
    packHash,
    floor: boundedInteger(input.floor, 1, 15, 'spire_task_report_location_invalid'),
    step: boundedInteger(input.step, 1, 10, 'spire_task_report_location_invalid'),
    setIndex: boundedInteger(input.setIndex, 0, 2, 'spire_task_report_location_invalid'),
    taskIndex: boundedInteger(input.taskIndex, 0, 9, 'spire_task_report_location_invalid'),
    reason,
  });
}

export function verifySpireTaskClaimAgainstPack(
  claim: SpireTaskReportClaim,
  rawPack: unknown,
  publishedPackHash: string,
): VerifiedSpireTaskClaim {
  const pack = row(rawPack) as Partial<SpirePack>;
  const floors = Array.isArray(pack.floors) ? pack.floors : [];
  const floor = floors.find((candidate) => row(candidate).floor === claim.floor);
  const steps = Array.isArray(row(floor).steps) ? row(floor).steps as unknown[] : [];
  const step = steps.find((candidate) => row(candidate).step === claim.step);
  const sets = Array.isArray(row(step).sets) ? row(step).sets as unknown[] : [];
  const set = sets[claim.setIndex];
  const tasks = Array.isArray(row(set).tasks) ? row(set).tasks as unknown[] : [];
  const task = row(tasks[claim.taskIndex]);
  const { packHash: _embeddedHash, ...packBody } = pack;
  const computedPackHash = spirePackHash(packBody);
  const exact = pack.schema === SPIRE_PACK_SCHEMA
    && pack.weekId === claim.weekId
    && pack.lang === claim.studyTarget
    && pack.tier === claim.tier
    && pack.packHash === claim.packHash
    && publishedPackHash === claim.packHash
    && computedPackHash === claim.packHash
    && row(floor).floor === claim.floor
    && row(step).step === claim.step
    && String(task.taskId ?? '') === claim.taskId;
  if (!exact) throw new Error('spire_task_report_pack_mismatch');
  return Object.freeze({
    ...claim,
    mode: String(task.mode ?? '').slice(0, 80),
    kind: String(task.kind ?? '').slice(0, 80),
    difficulty: Number(task.difficulty) || 0,
  });
}
