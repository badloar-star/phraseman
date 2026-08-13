import { createHash } from 'node:crypto';
import type { Decision } from './decision';
import { classifySeverity, type Severity } from './severity';

/**
 * Память уведомлений Джарвиса.
 *
 * contentHash намеренно НЕ подходит для anti-repeat: в нём есть текущие
 * числа, поэтому «125 писем» и «126 писем» выглядят двумя разными проблемами.
 * Здесь тема адресуется стабильным вопросом департамента, а повторная отправка
 * разрешается только при материальном изменении или после растущего cooldown.
 */

export const JARVIS_NOTIFICATION_MEMORY_FIELD = 'notificationMemoryV1';
export const MAX_NOTIFICATION_TOPICS = 64;

const DAY_MS = 24 * 60 * 60 * 1_000;

export interface NotificationTopicMemory {
  readonly lastSentAtMs: number;
  readonly deliveries: number;
  readonly severity: Severity;
  readonly evidence: Readonly<Record<string, number | null>>;
  readonly evidenceTrust: Readonly<Record<string, boolean>>;
}

export type NotificationMemory = Readonly<Record<string, NotificationTopicMemory>>;

export interface NoveltySelection {
  readonly selected: readonly Decision[];
  readonly suppressed: readonly Decision[];
}

function finiteNonNegative(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('ru')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Один и тот же бизнес-вопрос остаётся одной темой при изменении счётчиков. */
export function notificationTopicKey(decision: Decision): string {
  // У support один machine-сигнал — verified needs_reply. Его формулировка
  // меняется между «старая запись» и «растёт очередь», но issue остаётся тем
  // же. В остальных департаментах scope (урок/build/экран) сохраняется целиком,
  // включая числа: урок 3 нельзя склеить с уроком 4.
  const scope = decision.department === 'support'
    ? 'needs_reply'
    : normalizeText(decision.question);
  const stable = `${decision.department}|${scope}`;
  return createHash('sha256').update(stable, 'utf8').digest('hex').slice(0, 24);
}

function evidenceCounts(decision: Decision): Readonly<Record<string, number | null>> {
  const result: Record<string, number | null> = {};
  for (const item of decision.evidence) result[item.sourceId] = item.count;
  return Object.freeze(result);
}

function evidenceTrust(decision: Decision): Readonly<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  for (const item of decision.evidence) result[item.sourceId] = item.trustworthy;
  return Object.freeze(result);
}

function materiallyChanged(decision: Decision, previous: NotificationTopicMemory): boolean {
  if (classifySeverity(decision) !== previous.severity) return true;

  const currentCounts = evidenceCounts(decision);
  const currentTrust = evidenceTrust(decision);
  const sourceIds = new Set([
    ...Object.keys(currentCounts),
    ...Object.keys(previous.evidence),
    ...Object.keys(currentTrust),
    ...Object.keys(previous.evidenceTrust),
  ]);

  for (const sourceId of sourceIds) {
    if ((currentTrust[sourceId] ?? false) !== (previous.evidenceTrust[sourceId] ?? false)) return true;
    const before = previous.evidence[sourceId] ?? null;
    const after = currentCounts[sourceId] ?? null;
    if (before === null || after === null) {
      if (before !== after) return true;
      continue;
    }
    // Мелкое дрожание счётчика не является новой управленческой информацией.
    const threshold = Math.max(3, Math.ceil(Math.max(1, before) * 0.2));
    if (Math.abs(after - before) >= threshold) return true;
  }
  return false;
}

function cooldownMs(severity: Severity, deliveries: number): number {
  const index = Math.max(0, deliveries - 1);
  const daysBySeverity: Record<Severity, readonly number[]> = {
    P0: [1, 1, 2, 3],
    P1: [3, 7, 14, 30],
    P2: [7, 14, 30],
    P3: [14, 30],
  };
  const days = daysBySeverity[severity];
  return days[Math.min(index, days.length - 1)] * DAY_MS;
}

export function selectNovelNotifications(input: {
  readonly decisions: readonly Decision[];
  readonly memory: NotificationMemory;
  readonly nowMs: number;
}): NoveltySelection {
  const selected: Decision[] = [];
  const suppressed: Decision[] = [];

  for (const decision of input.decisions) {
    const previous = input.memory[notificationTopicKey(decision)];
    const send = previous === undefined
      || materiallyChanged(decision, previous)
      // Неизменённые PM-наблюдения не становятся новостями со временем.
      // Повтор допускается лишь для P0, где прямо сейчас заблокирован человек.
      || (previous.severity === 'P0'
        && input.nowMs - previous.lastSentAtMs >= cooldownMs(previous.severity, previous.deliveries));
    (send ? selected : suppressed).push(decision);
  }

  return Object.freeze({ selected: Object.freeze(selected), suppressed: Object.freeze(suppressed) });
}

export function recordDeliveredNotifications(input: {
  readonly memory: NotificationMemory;
  readonly delivered: readonly Decision[];
  readonly nowMs: number;
}): NotificationMemory {
  const next: Record<string, NotificationTopicMemory> = { ...input.memory };
  for (const decision of input.delivered) {
    const key = notificationTopicKey(decision);
    const previous = next[key];
    next[key] = Object.freeze({
      lastSentAtMs: input.nowMs,
      deliveries: (previous?.deliveries ?? 0) + 1,
      severity: classifySeverity(decision),
      evidence: evidenceCounts(decision),
      evidenceTrust: evidenceTrust(decision),
    });
  }

  const bounded = Object.entries(next)
    .sort(([, a], [, b]) => b.lastSentAtMs - a.lastSentAtMs)
    .slice(0, MAX_NOTIFICATION_TOPICS);
  return Object.freeze(Object.fromEntries(bounded));
}

export function parseNotificationMemory(raw: unknown): NotificationMemory {
  if (!raw || typeof raw !== 'object') return Object.freeze({});
  const root = raw as Record<string, unknown>;
  const candidate = root[JARVIS_NOTIFICATION_MEMORY_FIELD];
  if (!candidate || typeof candidate !== 'object') return Object.freeze({});

  const parsed: Record<string, NotificationTopicMemory> = {};
  for (const [key, value] of Object.entries(candidate as Record<string, unknown>).slice(0, MAX_NOTIFICATION_TOPICS)) {
    if (!/^[a-f0-9]{24}$/.test(key) || !value || typeof value !== 'object') continue;
    const item = value as Record<string, unknown>;
    const lastSentAtMs = finiteNonNegative(item.lastSentAtMs);
    const deliveries = finiteNonNegative(item.deliveries);
    const severity = item.severity;
    if (lastSentAtMs === null || deliveries === null || !['P0', 'P1', 'P2', 'P3'].includes(String(severity))) continue;

    const counts: Record<string, number | null> = {};
    if (item.evidence && typeof item.evidence === 'object') {
      for (const [sourceId, count] of Object.entries(item.evidence as Record<string, unknown>)) {
        if (sourceId.length > 80) continue;
        counts[sourceId] = count === null ? null : finiteNonNegative(count);
      }
    }
    const trust: Record<string, boolean> = {};
    if (item.evidenceTrust && typeof item.evidenceTrust === 'object') {
      for (const [sourceId, trusted] of Object.entries(item.evidenceTrust as Record<string, unknown>)) {
        if (sourceId.length <= 80 && typeof trusted === 'boolean') trust[sourceId] = trusted;
      }
    }
    parsed[key] = Object.freeze({
      lastSentAtMs,
      deliveries: Math.max(1, Math.floor(deliveries)),
      severity: severity as Severity,
      evidence: Object.freeze(counts),
      evidenceTrust: Object.freeze(trust),
    });
  }
  return Object.freeze(parsed);
}
