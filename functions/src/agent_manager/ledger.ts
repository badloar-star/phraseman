import { HttpsError } from 'firebase-functions/v2/https';
import { requireAgentOfficeOwner, type AgentOfficeAuth } from '../agent_office/auth';
import { parseAgentOfficeControl } from '../agent_office/contracts';
import {
  assertManagerTaskTransition,
  agentIdentifier,
  parseManagerTaskDraft,
  parseManagerTaskResult,
  type ManagerAllowedScope,
  type ManagerTaskDraft,
  type ManagerTaskResult,
  type ManagerTaskStatus,
} from './contracts';
import { managerTelegramDecisionId, managerTelegramTokenPath, parseManagerTelegramToken, type ManagerTelegramDecision, type ManagerTelegramToken } from './telegram_contracts';
import { parseExecutionJob } from './execution_contracts';
import { buildLocalRunnerCodePrepareJob } from './local_runner_transport';

const GLOBAL_CONTROL_PATH = 'agent_office_control/global';

export interface AgentManagerDocument { readonly id: string; readonly data: Record<string, unknown>; }
export interface AgentManagerQuery { readonly collection: 'agent_manager_agents' | 'agent_manager_tasks' | 'agent_manager_task_events'; readonly orderBy: 'updatedAtMs' | 'occurredAtMs'; readonly limit: number; }
export interface AgentManagerTransaction {
  get(path: string): Promise<AgentManagerDocument | null>;
  create(path: string, data: Record<string, unknown>): void;
  update(path: string, data: Record<string, unknown>): void;
}
export interface AgentManagerRepository {
  get(path: string): Promise<AgentManagerDocument | null>;
  query(input: AgentManagerQuery): Promise<readonly AgentManagerDocument[]>;
  runTransaction<T>(body: (transaction: AgentManagerTransaction) => Promise<T>): Promise<T>;
}

type PersistedTask = Readonly<Omit<ManagerTaskDraft, 'status'> & {
  readonly status: Exclude<ManagerTaskStatus, 'draft'>;
  readonly assignedAgentId: string;
  readonly createdByUid: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly revision: number;
  readonly result: ManagerTaskResult | null;
}>;

function fail(message: string): never { throw new HttpsError('invalid-argument', message); }
function row(value: unknown, label: string): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`); return value as Record<string, unknown>; }
function exact(input: Record<string, unknown>, keys: readonly string[], label: string): void { if (Object.keys(input).some((key) => !keys.includes(key)) || keys.some((key) => !(key in input))) fail(`${label} fields are invalid`); }
function id(value: unknown, label: string): string { if (typeof value !== 'string' || !/^[A-Za-z][A-Za-z0-9._:-]{2,159}$/.test(value)) fail(`${label} is invalid`); return value; }
function integer(value: unknown, label: string, min = 0): number { if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) fail(`${label} is invalid`); return value; }
function status(value: unknown): ManagerTaskStatus { const all: readonly ManagerTaskStatus[] = ['draft', 'planned', 'awaiting_approval', 'queued', 'in_progress', 'needs_review', 'completed', 'archived', 'cancelled', 'failed']; if (typeof value !== 'string' || !all.includes(value as ManagerTaskStatus)) fail('status is invalid'); return value as ManagerTaskStatus; }

function requireReadyGlobalControl(document: AgentManagerDocument | null): number {
  if (!document) throw new HttpsError('failed-precondition', 'Agent Manager global control is unavailable');
  let control: ReturnType<typeof parseAgentOfficeControl>;
  try { control = parseAgentOfficeControl(document.data); } catch { throw new HttpsError('failed-precondition', 'Agent Manager global control is unavailable'); }
  if (control.killSwitchEnabled) throw new HttpsError('failed-precondition', 'Agent Manager global kill switch is enabled');
  return control.revision;
}

function createLocalRunnerJobIfRequired(transaction: AgentManagerTransaction, task: PersistedTask, nowMs: number): void {
  if (task.status !== 'queued' || task.allowedScope !== 'code_prepare') return;
  transaction.create(`agent_manager_execution_jobs/${task.taskId}__r${task.revision}`, buildLocalRunnerCodePrepareJob(task.taskId, task.revision, nowMs));
}

function parsePersistedTask(value: unknown): PersistedTask {
  const input = row(value, 'manager task record');
  exact(input, ['schemaVersion', 'taskId', 'title', 'brief', 'priority', 'deadlineAtMs', 'allowedScope', 'sourceLinks', 'status', 'assignedAgentId', 'createdByUid', 'createdAtMs', 'updatedAtMs', 'revision', 'result'], 'manager task record');
  const draft = parseManagerTaskDraft({
    taskId: input.taskId, title: input.title, brief: input.brief, priority: input.priority,
    deadlineAtMs: input.deadlineAtMs, allowedScope: input.allowedScope, sourceLinks: input.sourceLinks,
  });
  if (input.schemaVersion !== 1 || status(input.status) === 'draft') fail('manager task record status is invalid');
  return Object.freeze({ ...draft, status: status(input.status) as Exclude<ManagerTaskStatus, 'draft'>, assignedAgentId: id(input.assignedAgentId, 'assignedAgentId'), createdByUid: id(input.createdByUid, 'createdByUid'), createdAtMs: integer(input.createdAtMs, 'createdAtMs'), updatedAtMs: integer(input.updatedAtMs, 'updatedAtMs'), revision: integer(input.revision, 'revision', 1), result: input.result === null ? null : parseManagerTaskResult(input.result) });
}

type ExecutionStatusProjection = Readonly<{
  state: 'queued' | 'leased' | 'succeeded' | 'failed' | 'cancelled';
  attempts: number;
  maxAttempts: number;
  updatedAtMs: number;
  finishedAtMs: number | null;
}>;

function projectExecutionStatus(value: unknown, task: PersistedTask, allowedRevisions: readonly number[]): ExecutionStatusProjection | null {
  try {
    const job = parseExecutionJob(value);
    if (job.taskId !== task.taskId || !allowedRevisions.includes(job.taskRevision)) return null;
    return Object.freeze({ state: job.state, attempts: job.attempts, maxAttempts: job.maxAttempts, updatedAtMs: job.updatedAtMs, finishedAtMs: job.finishedAtMs });
  } catch {
    return null;
  }
}

function executionRevisionCandidates(task: PersistedTask): readonly number[] {
  const revisions = [task.revision];
  // A worker changes queued rN into in_progress rN+1 and needs_review rN+2.
  // Keep the job association visible after a later manual completion/archive as well.
  if (['needs_review', 'completed', 'archived', 'cancelled', 'failed'].includes(task.status)) {
    for (const delta of [1, 2, 3, 4]) {
      const candidate = task.revision - delta;
      if (candidate >= 1) revisions.push(candidate);
    }
  }
  return Object.freeze([...new Set(revisions)]);
}

function projectTask(task: PersistedTask, execution: ExecutionStatusProjection | null = null) {
  return Object.freeze({
    taskId: task.taskId, title: task.title, brief: task.brief, priority: task.priority, deadlineAtMs: task.deadlineAtMs,
    allowedScope: task.allowedScope, sourceLinks: task.sourceLinks, status: task.status, assignedAgentId: task.assignedAgentId,
    createdAtMs: task.createdAtMs, updatedAtMs: task.updatedAtMs, revision: task.revision, result: task.result, execution,
  });
}

function parseCreateInput(value: unknown): ManagerTaskDraft { return parseManagerTaskDraft(value); }
export type ManagerInboxTaskInput = Readonly<{
  sourceType: 'support' | 'report';
  sourceRef: string;
  reportSource: string | null;
  /** Server-only lookup key. It must never be copied into the task or its projection. */
  sourceDocumentId: string;
}>;
export type ManagerTelegramDecisionGuard = Readonly<{ token: ManagerTelegramToken; updateIdHash: string; decision: ManagerTelegramDecision }>;
function parseTransitionInput(value: unknown): Readonly<{ taskId: string; expectedRevision: number; status: ManagerTaskStatus; result: ManagerTaskResult | null }> {
  const input = row(value, 'manager task transition');
  const keys = Object.keys(input); if (keys.some((key) => !['taskId', 'expectedRevision', 'status', 'result'].includes(key)) || !['taskId', 'expectedRevision', 'status'].every((key) => key in input)) fail('manager task transition fields are invalid');
  return Object.freeze({ taskId: id(input.taskId, 'taskId'), expectedRevision: integer(input.expectedRevision, 'expectedRevision', 1), status: status(input.status), result: input.result === undefined || input.result === null ? null : parseManagerTaskResult(input.result) });
}
function parseListInput(value: unknown): number {
  const input = row(value, 'manager task list'); exact(input, ['limit'], 'manager task list'); const limit = integer(input.limit, 'limit', 1); if (limit > 100) fail('limit is invalid'); return limit;
}

function event(task: PersistedTask, eventType: 'task_created' | 'task_transitioned', occurredAtMs: number, actorUid: string, fromStatus?: ManagerTaskStatus): Record<string, unknown> {
  return {
    schemaVersion: 1, eventId: `${task.taskId}__r${task.revision}`, taskId: task.taskId, eventType,
    fromStatus: fromStatus ?? null, toStatus: task.status, assignedAgentId: task.assignedAgentId,
    taskRevision: task.revision, occurredAtMs, actorUid, actorRole: 'owner', piiClass: 'none',
  };
}

function specialistFor(scope: ManagerAllowedScope): string {
  return ({ analysis_only: 'analytics', support_draft: 'support', report_triage: 'reports', code_prepare: 'developer', content_prepare: 'content' })[scope];
}

const DEFAULT_ROSTER = Object.freeze([
  ['manager', 'manager', 'Менеджер агентов', ['analysis_only', 'support_draft', 'code_prepare', 'content_prepare']],
  ['analytics', 'analytics', 'Аналитик', ['analysis_only']], ['support', 'support', 'Поддержка', ['support_draft']],
  ['reports', 'reports', 'Репорты', ['analysis_only']], ['developer', 'developer', 'Разработчик', ['code_prepare']],
  ['qa', 'qa', 'Контроль качества', ['analysis_only']], ['content', 'content', 'Контент', ['content_prepare']],
] as const);

type ManagerRunbookProjection = Readonly<{
  readonly runbookId: 'task-status-flow' | 'approval-limits' | 'mail-report-handoff' | 'telegram-approval-boundary' | 'archive';
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly string[];
}>;

const RUNBOOK_PROJECTIONS: readonly ManagerRunbookProjection[] = Object.freeze([
  Object.freeze({
    runbookId: 'task-status-flow', title: 'Статусы задач',
    summary: 'Задача проходит план, отдельное согласование, очередь, работу, проверку, завершение и архив.',
    steps: Object.freeze(['План создаёт менеджер.', 'В очередь задача попадает только после согласования владельца.', 'Результат фиксируется до проверки и завершения.']),
  }),
  Object.freeze({
    runbookId: 'approval-limits', title: 'Пределы согласования',
    summary: 'Внешние действия, изменение production, запуск кода и работа с сессией требуют отдельного одобрения владельца.',
    steps: Object.freeze(['Без одобрения допустима только подготовка в разрешённой области.', 'Одобрение относится к конкретной задаче и её области.', 'Одобрение не запускает действие автоматически.']),
  }),
  Object.freeze({
    runbookId: 'mail-report-handoff', title: 'Почта и репорты',
    summary: 'Почта поддержки и пользовательские репорты передаются как безопасные входящие ссылки, а не как автоматические ответы.',
    steps: Object.freeze(['Откройте Почту или Репорты для исходной очереди.', 'Создайте отдельную задачу с безопасным контекстом.', 'Проверяйте черновик перед любой отправкой.']),
  }),
  Object.freeze({
    runbookId: 'telegram-approval-boundary', title: 'Telegram: граница согласования',
    summary: 'Telegram может только отразить согласование через привязанный краткоживущий webhook; он не заменяет владельца и не исполняет задачу.',
    steps: Object.freeze(['Проверьте владельца и конкретную задачу.', 'Подтвердите действие в защищённом потоке согласования.', 'Исполнение остаётся отдельным будущим адаптером.']),
  }),
  Object.freeze({
    runbookId: 'archive', title: 'Архив',
    summary: 'Завершённые, отменённые и неуспешные задачи переводятся в архив, сохраняя безопасный журнал статусов.',
    steps: Object.freeze(['Убедитесь, что результат или причина зафиксированы.', 'Переведите задачу в доступный конечный статус.', 'Архивируйте задачу без удаления истории.']),
  }),
]);

export class AgentManagerLedger {
  constructor(private readonly repository: AgentManagerRepository, private readonly now: () => number = Date.now) {}

  async requireGlobalControlReady(auth: AgentOfficeAuth | null | undefined) {
    requireAgentOfficeOwner(auth);
    const revision = requireReadyGlobalControl(await this.repository.get(GLOBAL_CONTROL_PATH));
    return Object.freeze({ ok: true as const, revision });
  }

  async initializeRoster(auth: AgentOfficeAuth | null | undefined) {
    requireAgentOfficeOwner(auth); const nowMs = this.now();
    return this.repository.runTransaction(async (transaction) => {
      const existingRoster = await Promise.all(DEFAULT_ROSTER.map(async ([agentId]) =>
        Object.freeze([agentId, await transaction.get(`agent_manager_agents/${agentId}`)] as const),
      ));
      const existingByAgentId = new Map(existingRoster);
      let created = 0;
      for (const [agentId, role, label, allowedScopes] of DEFAULT_ROSTER) {
        const path = `agent_manager_agents/${agentId}`;
        const existing = existingByAgentId.get(agentId) ?? null;
        const rosterScopes = role === 'reports' ? ['report_triage'] : allowedScopes;
        if (existing) {
          const existingScopes = Array.isArray(existing.data.allowedScopes) ? existing.data.allowedScopes : [];
          const missingOrderingTimestamp = !Number.isSafeInteger(existing.data.updatedAtMs);
          if ((role === 'reports' && !existingScopes.includes('report_triage')) || missingOrderingTimestamp) {
            transaction.update(path, {
              ...(role === 'reports' && !existingScopes.includes('report_triage') ? { allowedScopes: rosterScopes } : {}),
              updatedAtMs: nowMs,
            });
          }
          continue;
        }
        transaction.create(path, { schemaVersion: 1, agentId, role, label, enabled: true, allowedScopes: rosterScopes, lastCheckInAtMs: 0, updatedAtMs: nowMs });
        created += 1;
      }
      return Object.freeze({ ok: true as const, created });
    });
  }

  async createTask(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    const actor = requireAgentOfficeOwner(auth); const draft = parseCreateInput(value); const nowMs = this.now();
    const task: PersistedTask = Object.freeze({ ...draft, status: 'planned', assignedAgentId: 'manager', createdByUid: actor.actorUid, createdAtMs: nowMs, updatedAtMs: nowMs, revision: 1, result: null });
    return this.repository.runTransaction(async (transaction) => {
      const path = `agent_manager_tasks/${task.taskId}`;
      if (await transaction.get(path)) throw new HttpsError('already-exists', 'manager task already exists');
      transaction.create(path, task as unknown as Record<string, unknown>);
      transaction.create(`agent_manager_task_events/${task.taskId}__r1`, event(task, 'task_created', nowMs, actor.actorUid));
      return Object.freeze({ ok: true as const, item: projectTask(task) });
    });
  }

  async createInboxTask(auth: AgentOfficeAuth | null | undefined, input: ManagerInboxTaskInput) {
    const actor = requireAgentOfficeOwner(auth); const nowMs = this.now();
    const sourceType = input.sourceType === 'support' || input.sourceType === 'report' ? input.sourceType : fail('inbox sourceType is invalid');
    const sourceRef = typeof input.sourceRef === 'string' && /^((support)|(report)):sha256:[a-f0-9]{64}$/.test(input.sourceRef) && input.sourceRef.startsWith(`${sourceType}:`)
      ? input.sourceRef : fail('inbox sourceRef is invalid');
    if (input.reportSource !== null && (typeof input.reportSource !== 'string' || !/^[a-z_]{3,64}$/.test(input.reportSource))) fail('inbox reportSource is invalid');
    const sourceDocumentId = typeof input.sourceDocumentId === 'string' && /^[A-Za-z0-9._-]{3,400}$/.test(input.sourceDocumentId)
      ? input.sourceDocumentId
      : fail('inbox sourceDocumentId is invalid');
    const hash = sourceRef.slice(-64);
    const taskId = `intake-${hash.slice(0, 32)}`;
    const draft = parseManagerTaskDraft({
      taskId,
      title: sourceType === 'support' ? 'Support item awaiting safe draft' : 'Report awaiting triage',
      brief: sourceType === 'support'
        ? 'A support item was linked without copying its message content. Prepare only a draft response for manual review.'
        : 'A report was linked without copying its content. Classify the issue and prepare a safe recommendation for manual review.',
      priority: 'normal', deadlineAtMs: null,
      allowedScope: sourceType === 'support' ? 'support_draft' : 'report_triage',
      sourceLinks: [{ sourceType, sourceRef }],
    });
    const task: PersistedTask = Object.freeze({ ...draft, status: 'planned', assignedAgentId: 'manager', createdByUid: actor.actorUid, createdAtMs: nowMs, updatedAtMs: nowMs, revision: 1, result: null });
    return this.repository.runTransaction(async (transaction) => {
      const linkPath = `agent_manager_inbox_links/${hash}`;
      const existingLink = await transaction.get(linkPath);
      if (existingLink) {
        const existingTaskId = id(existingLink.data.taskId, 'inbox taskId');
        const existingTask = await transaction.get(`agent_manager_tasks/${existingTaskId}`);
        if (!existingTask) throw new HttpsError('failed-precondition', 'inbox link task is missing');
        return Object.freeze({ ok: true as const, replayed: true as const, item: projectTask(parsePersistedTask(existingTask.data)) });
      }
      if (await transaction.get(`agent_manager_tasks/${task.taskId}`)) throw new HttpsError('already-exists', 'manager task already exists');
      transaction.create(`agent_manager_tasks/${task.taskId}`, task as unknown as Record<string, unknown>);
      transaction.create(`agent_manager_task_events/${task.taskId}__r1`, event(task, 'task_created', nowMs, actor.actorUid));
      transaction.create(linkPath, {
        schemaVersion: 1, sourceRef, sourceType, reportSource: input.reportSource,
        sourceCollection: sourceType === 'support' ? 'support_inbox' : input.reportSource, sourceDocumentId,
        taskId: task.taskId, createdAtMs: nowMs, createdByUid: actor.actorUid, piiClass: 'none',
      });
      return Object.freeze({ ok: true as const, replayed: false as const, item: projectTask(task) });
    });
  }

  async transitionTask(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    const actor = requireAgentOfficeOwner(auth); const input = parseTransitionInput(value); const nowMs = this.now();
    return this.repository.runTransaction(async (transaction) => {
      const path = `agent_manager_tasks/${input.taskId}`; const document = await transaction.get(path);
      if (!document) throw new HttpsError('not-found', 'manager task not found');
      const current = parsePersistedTask(document.data);
      if (current.revision !== input.expectedRevision) throw new HttpsError('failed-precondition', 'stale task revision');
      assertManagerTaskTransition(current.status, input.status);
      if (current.status === 'in_progress' && input.status === 'needs_review' && !input.result) throw new HttpsError('failed-precondition', 'task result is required');
      if (current.status === 'needs_review' && input.status === 'completed' && !current.result) throw new HttpsError('failed-precondition', 'task result is required');
      if (current.status === 'awaiting_approval' && input.status === 'queued') {
        requireReadyGlobalControl(await transaction.get(GLOBAL_CONTROL_PATH));
      }
      const assignedAgentId = current.status === 'planned' && input.status === 'awaiting_approval' ? specialistFor(current.allowedScope) : current.assignedAgentId;
      if (current.status === 'planned' && input.status === 'awaiting_approval') {
        const agent = await transaction.get(`agent_manager_agents/${assignedAgentId}`);
        const scopes = Array.isArray(agent?.data.allowedScopes) ? agent.data.allowedScopes : [];
        if (!agent || agent.data.agentId !== assignedAgentId || agent.data.enabled !== true || !scopes.includes(current.allowedScope)) {
          throw new HttpsError('failed-precondition', 'assigned agent is unavailable');
        }
      }
      const result = input.result ?? current.result;
      const next: PersistedTask = Object.freeze({ ...current, status: input.status as Exclude<ManagerTaskStatus, 'draft'>, assignedAgentId, revision: current.revision + 1, updatedAtMs: nowMs, result });
      transaction.update(path, { status: next.status, assignedAgentId: next.assignedAgentId, revision: next.revision, updatedAtMs: nowMs, result: next.result });
      if (current.status === 'awaiting_approval' && input.status === 'queued') {
        transaction.create(`agent_manager_approvals/${next.taskId}__r${next.revision}`, {
          schemaVersion: 1, approvalId: `${next.taskId}__r${next.revision}`, taskId: next.taskId,
          taskRevision: next.revision, approvedByUid: actor.actorUid, approvedAtMs: nowMs,
          fromStatus: current.status, toStatus: next.status, piiClass: 'none',
        });
        createLocalRunnerJobIfRequired(transaction, next, nowMs);
      }
      transaction.create(`agent_manager_task_events/${next.taskId}__r${next.revision}`, event(next, 'task_transitioned', nowMs, actor.actorUid, current.status));
      return Object.freeze({ ok: true as const, item: projectTask(next) });
    });
  }

  async decideTelegramTask(auth: AgentOfficeAuth | null | undefined, guard: ManagerTelegramDecisionGuard) {
    const actor = requireAgentOfficeOwner(auth); const nowMs = this.now();
    const token = parseManagerTelegramToken(guard.token);
    if (!/^[a-f0-9]{64}$/.test(guard.updateIdHash) || token.permittedDecision !== guard.decision) fail('manager Telegram decision guard is invalid');
    const tokenPath = managerTelegramTokenPath(token.tokenIdHash);
    return this.repository.runTransaction(async (transaction) => {
      const controlDocument = await transaction.get(GLOBAL_CONTROL_PATH);
      const tokenDocument = await transaction.get(tokenPath);
      if (!tokenDocument) throw new HttpsError('not-found', 'manager Telegram token not found');
      const persisted = parseManagerTelegramToken(tokenDocument.data);
      if (persisted.tokenIdHash !== token.tokenIdHash || persisted.ownerUid !== actor.actorUid || persisted.permittedDecision !== guard.decision) throw new HttpsError('permission-denied', 'manager Telegram token binding mismatch');
      if (persisted.status === 'consumed') {
        if (persisted.consumedUpdateIdHash !== guard.updateIdHash) throw new HttpsError('failed-precondition', 'manager Telegram token replay mismatch');
        const existing = await transaction.get(`agent_manager_tasks/${persisted.taskId}`);
        if (!existing) throw new HttpsError('failed-precondition', 'manager Telegram task is missing');
        return Object.freeze({ ok: true as const, idempotent: true as const, decision: guard.decision, item: projectTask(parsePersistedTask(existing.data)) });
      }
      if (persisted.status !== 'active' || persisted.issuedAtMs > nowMs || persisted.validUntilMs <= nowMs) throw new HttpsError('failed-precondition', 'manager Telegram token is unavailable');
      const taskPath = `agent_manager_tasks/${persisted.taskId}`; const taskDocument = await transaction.get(taskPath);
      if (!taskDocument) throw new HttpsError('not-found', 'manager task not found');
      const current = parsePersistedTask(taskDocument.data);
      if (current.revision !== persisted.expectedRevision || current.status !== 'awaiting_approval') throw new HttpsError('failed-precondition', 'manager Telegram task is stale');
      requireReadyGlobalControl(controlDocument);
      const nextStatus = guard.decision === 'approve' ? 'queued' : 'cancelled';
      const next: PersistedTask = Object.freeze({ ...current, status: nextStatus, revision: current.revision + 1, updatedAtMs: nowMs });
      const decisionId = managerTelegramDecisionId(persisted.tokenIdHash);
      transaction.update(taskPath, { status: next.status, revision: next.revision, updatedAtMs: nowMs });
      transaction.create(`agent_manager_approvals/${decisionId}`, {
        schemaVersion: 1, approvalId: decisionId, taskId: next.taskId, taskRevision: next.revision,
        approvedByUid: actor.actorUid, approvedAtMs: nowMs, fromStatus: current.status, toStatus: next.status,
        decision: guard.decision, origin: 'telegram', updateIdHash: guard.updateIdHash, piiClass: 'none',
      });
      transaction.create(`agent_manager_task_events/${next.taskId}__r${next.revision}`, event(next, 'task_transitioned', nowMs, actor.actorUid, current.status));
      createLocalRunnerJobIfRequired(transaction, next, nowMs);
      transaction.update(tokenPath, { status: 'consumed', consumedAtMs: nowMs, consumedDecisionId: decisionId, consumedUpdateIdHash: guard.updateIdHash });
      return Object.freeze({ ok: true as const, idempotent: false as const, decision: guard.decision, item: projectTask(next) });
    });
  }

  async listTasks(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeOwner(auth); const limit = parseListInput(value); const rows = await this.repository.query({ collection: 'agent_manager_tasks', orderBy: 'updatedAtMs', limit });
    const tasks = rows.map((document) => parsePersistedTask(document.data));
    const executions = await Promise.all(tasks.map(async (task) => {
      const candidates = executionRevisionCandidates(task);
      for (const revision of candidates) {
        const document = await this.repository.get(`agent_manager_execution_jobs/${task.taskId}__r${revision}`);
        const execution = document ? projectExecutionStatus(document.data, task, candidates) : null;
        if (execution) return execution;
      }
      return null;
    }));
    return Object.freeze({ ok: true as const, items: Object.freeze(tasks.map((task, index) => projectTask(task, executions[index]))) });
  }

  async listAgents(auth: AgentOfficeAuth | null | undefined, value: unknown) {
    requireAgentOfficeOwner(auth); const limit = parseListInput(value); const rows = await this.repository.query({ collection: 'agent_manager_agents', orderBy: 'updatedAtMs', limit });
    return Object.freeze({ ok: true as const, items: Object.freeze(rows.map((document) => Object.freeze({ agentId: agentIdentifier(document.data.agentId), role: document.data.role, label: document.data.label, enabled: document.data.enabled, allowedScopes: document.data.allowedScopes, lastCheckInAtMs: document.data.lastCheckInAtMs ?? null }))) });
  }

  async listRunbooks(auth: AgentOfficeAuth | null | undefined) {
    requireAgentOfficeOwner(auth);
    return Object.freeze({ ok: true as const, items: RUNBOOK_PROJECTIONS });
  }
}

export type { ManagerAllowedScope };
