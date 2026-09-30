import {
  spireTaskFlagAdd,
  spireTaskFlagRemove,
  type SpireTaskFlagsDoc,
} from './spire_task_flag_contract';
import { createHash } from 'crypto';

export const SPIRE_TASK_INCIDENTS_COLLECTION = 'spire_task_incidents' as const;
export const SPIRE_TASK_INCIDENT_SCHEMA = 'spire-task-incident-v1' as const;

export type SpireTaskIncidentLang = 'es' | 'fr' | 'de';
export type SpireTaskIncidentState = 'quarantined' | 'restored';
export type SpireTaskQuarantineOwner = 'incident' | 'manual';

export type SpireTaskIncident = Readonly<{
  schemaVersion: typeof SPIRE_TASK_INCIDENT_SCHEMA;
  studyTarget: SpireTaskIncidentLang;
  taskId: string;
  state: SpireTaskIncidentState;
  quarantineOwner: SpireTaskQuarantineOwner;
  manualHoldActive: boolean;
  revision: number;
  reportCount: number;
  firstReportedAtMs: number;
  latestReportedAtMs: number;
  latestReportId: string;
  latestWeekId: string;
  latestTier: number;
  latestPackHash: string;
  latestReason: string;
  latestMode: string;
  latestDifficulty: number;
  updatedAtMs: number;
}>;

export type SpireTaskIncidentEvidence = Readonly<{
  reportId: string;
  studyTarget: SpireTaskIncidentLang;
  taskId: string;
  weekId: string;
  tier: number;
  packHash: string;
  reason: string;
  mode: string;
  difficulty: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function spireTaskIncidentId(lang: SpireTaskIncidentLang, taskId: string): string {
  const cleanTaskId = String(taskId ?? '').trim();
  if (!cleanTaskId.startsWith(`arena-${lang}-`) || !/^[A-Za-z0-9_-]{1,200}$/u.test(cleanTaskId)) {
    throw new Error('spire_task_incident_task_invalid');
  }
  return `${lang}__${cleanTaskId}`;
}

export function spireTaskIncidentOperationId(
  lang: SpireTaskIncidentLang,
  taskId: string,
  expectedRevision: number,
  nextState: SpireTaskIncidentState,
): string {
  spireTaskIncidentId(lang, taskId);
  if (!positiveInteger(expectedRevision)) throw new Error('spire_task_incident_revision_invalid');
  const digest = createHash('sha256')
    .update(JSON.stringify(['spire-task-incident-v1', lang, taskId, expectedRevision, nextState]), 'utf8')
    .digest('hex');
  return `spire_incident_${digest}`;
}

export function parseSpireTaskIncident(raw: unknown, lang: SpireTaskIncidentLang, taskId: string): SpireTaskIncident {
  if (!isRecord(raw)
    || raw.schemaVersion !== SPIRE_TASK_INCIDENT_SCHEMA
    || raw.studyTarget !== lang
    || raw.taskId !== taskId
    || (raw.state !== 'quarantined' && raw.state !== 'restored')
    || (raw.quarantineOwner !== 'incident' && raw.quarantineOwner !== 'manual')
    || typeof raw.manualHoldActive !== 'boolean'
    || (raw.manualHoldActive && raw.quarantineOwner !== 'manual')
    || !positiveInteger(raw.revision)
    || !positiveInteger(raw.reportCount)
    || !positiveInteger(raw.firstReportedAtMs)
    || !positiveInteger(raw.latestReportedAtMs)
    || !positiveInteger(raw.updatedAtMs)
    || typeof raw.latestReportId !== 'string'
    || !raw.latestReportId
    || typeof raw.latestWeekId !== 'string'
    || typeof raw.latestPackHash !== 'string'
    || typeof raw.latestReason !== 'string'
    || typeof raw.latestMode !== 'string'
    || !Number.isSafeInteger(raw.latestTier)
    || !Number.isFinite(raw.latestDifficulty)) {
    throw new Error('spire_task_incident_invalid');
  }
  return raw as SpireTaskIncident;
}

export function planAcceptedSpireTaskReport(input: Readonly<{
  existing: SpireTaskIncident | null;
  evidence: SpireTaskIncidentEvidence;
  nowMs: number;
  flags: SpireTaskFlagsDoc;
}>): Readonly<{
  incident: SpireTaskIncident;
  nextFlags: SpireTaskFlagsDoc;
  transition: 'quarantined' | 'already_quarantined';
}> {
  const { existing, evidence, nowMs } = input;
  if (!positiveInteger(nowMs)) throw new Error('spire_task_incident_time_invalid');
  const wasQuarantined = existing?.state === 'quarantined';
  const alreadyFlagged = !!input.flags.flagged[evidence.taskId];
  const quarantineOwner: SpireTaskQuarantineOwner = wasQuarantined
    ? existing!.quarantineOwner
    : (alreadyFlagged ? 'manual' : 'incident');
  const manualHoldActive = quarantineOwner === 'manual' && alreadyFlagged;
  const revision = existing ? existing.revision + (wasQuarantined ? 0 : 1) : 1;
  const incident: SpireTaskIncident = Object.freeze({
    schemaVersion: SPIRE_TASK_INCIDENT_SCHEMA,
    studyTarget: evidence.studyTarget,
    taskId: evidence.taskId,
    state: 'quarantined',
    quarantineOwner,
    manualHoldActive,
    revision,
    reportCount: (existing?.reportCount ?? 0) + 1,
    firstReportedAtMs: existing?.firstReportedAtMs ?? nowMs,
    latestReportedAtMs: nowMs,
    latestReportId: evidence.reportId,
    latestWeekId: evidence.weekId,
    latestTier: evidence.tier,
    latestPackHash: evidence.packHash,
    latestReason: evidence.reason.slice(0, 1000),
    latestMode: evidence.mode.slice(0, 80),
    latestDifficulty: evidence.difficulty,
    updatedAtMs: nowMs,
  });
  const nextFlags = alreadyFlagged
    ? input.flags
    : spireTaskFlagAdd(input.flags, {
      taskId: evidence.taskId,
      reason: 'Жалоба игрока',
      flaggedAtMs: nowMs,
      flaggedByUid: 'server:client-report',
    });
  return Object.freeze({
    incident,
    nextFlags,
    transition: wasQuarantined ? 'already_quarantined' : 'quarantined',
  });
}

export function planSpireTaskIncidentStateChange(input: Readonly<{
  incident: SpireTaskIncident;
  nextState: SpireTaskIncidentState;
  actorUid: string;
  nowMs: number;
  flags: SpireTaskFlagsDoc;
}>): Readonly<{ incident: SpireTaskIncident; nextFlags: SpireTaskFlagsDoc }> {
  if (input.incident.state === input.nextState) throw new Error('spire_task_incident_state_unchanged');
  const nextOwner: SpireTaskQuarantineOwner = input.nextState === 'quarantined'
    ? (input.flags.flagged[input.incident.taskId] && input.incident.manualHoldActive ? 'manual' : 'incident')
    : input.incident.quarantineOwner;
  const incident: SpireTaskIncident = Object.freeze({
    ...input.incident,
    state: input.nextState,
    quarantineOwner: nextOwner,
    manualHoldActive: nextOwner === 'manual' && input.incident.manualHoldActive,
    revision: input.incident.revision + 1,
    updatedAtMs: input.nowMs,
  });
  const nextFlags = input.nextState === 'restored'
    ? (input.incident.quarantineOwner === 'incident'
      ? spireTaskFlagRemove(input.flags, input.incident.taskId)
      : input.flags)
    : (input.flags.flagged[input.incident.taskId] ? input.flags : spireTaskFlagAdd(input.flags, {
      taskId: input.incident.taskId,
      reason: 'Повторно открыто администратором',
      flaggedAtMs: input.nowMs,
      flaggedByUid: input.actorUid,
    }));
  return Object.freeze({ incident, nextFlags });
}
